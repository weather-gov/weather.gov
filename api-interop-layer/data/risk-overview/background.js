import { parentPort } from "node:worker_threads";
import openDatabase from "../db.js";
import { fetchAPIJson } from "../../util/fetch.js";

// Generally, risk overview image URLs use the same risk names as the data, but
// in a few cases, they do not. This is a mapping for those outliers.
const riskNameToImageNameMap = new Map([
  ["ConvectiveWind", "ThunderstormWind"],
  ["Frost/Freeze", "FrostFreeze"],
  ["Marine", "MarineHazard"],
  ["NonConvectiveWind", "Wind"],
  ["SevereThunderstorm", "SevereThunderstorms"],
]);

// Update if the key already exists, otherwise insert.
const upsert = async (id, data) =>
  openDatabase().then((db) =>
    db.query(
      `INSERT INTO weathergov_temp_ghwo
      (id,data)
      VALUES($1::text,$2::json)
    ON CONFLICT (id)
    DO UPDATE
      SET data=$2::json`,
      [id, data],
    ),
  );

// Risk overview data is arranged as an object, some of whose keys are timestamps.
// This method pulls out the timestamp keys and returns an array of days containing
// that data instead of an object.
const processDays = (data) =>
  // Get the keys that are timestamps.
  Object.keys(data)
    .filter((key) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[-+]\d{2}:\d{2}$/.test(key),
    )
    .map((timestamp, index) => ({
      ...data[timestamp],
      dayNumber: index + 1,
      timestamp,
      images: {},
    }));

const processState = async ({ state, data: stateData, wfo }) => {
  const db = await openDatabase();
  const stateName = await db
    .query("SELECT name FROM weathergov_geo_states WHERE state=$1::text", [
      state,
    ])
    .then(({ rows }) => rows.pop().name);

  const data = {
    state: stateName,
    days: processDays(stateData),
    wfo,
  };

  await upsert(state, data);
  parentPort.postMessage({
    action: "log",
    level: "verbose",
    message: `updated risk overview for state ${state} (${stateName}) from WFO ${wfo.toUpperCase()}`,
  });
};

const processCounty = async ({ countyFips, data: countyData, wfo }) => {
  const db = await openDatabase();
  const county = db
    .query(
      "SELECT st,countyname FROM weathergov_geo_counties WHERE countyfips=$1::text",
      [countyFips],
    )
    .then(({ rows }) => rows.pop());

  const data = {
    state: county.st,
    county: county.countyname,
    fips: countyFips,
    days: processDays(countyData),
    wfo,
  };

  data.days.forEach((day) => {
    // For every data element in the risk overview, we want to also provide an
    // image URL. The list of data elements is not the same for all WFOs at all
    // times, so we need to build this dynamically.
    const elementKeys = Object.keys(day);
    for (const elementKey of elementKeys) {
      // There's no image URL for the daily composite risk, so skip that one.
      if (elementKey !== "DailyComposite" && elementKey !== "images") {
        // Sometimes the element key (like "SevereThunderstorm") is not the same
        // key as used in the URL (in this case, "SevereThunderstorms" - note
        // the s at the end). If we have a URL key mapped to the element key,
        // use it. Otherwise just preserve the element key.
        const urlKey = riskNameToImageNameMap.get(elementKey) ?? elementKey;
        // Build the image URL from the WFO, element key, and day number.
        day.images[elementKey] =
          `https://www.weather.gov/images/${wfo}/ghwo/${urlKey}Day${day.dayNumber}.jpg`;
      }
    }
  });

  await upsert(countyFips, data);
  parentPort.postMessage({
    action: "log",
    level: "verbose",
    message: `updated risk overview for county ${countyFips} from WFO ${wfo.toUpperCase()}`,
  });
};

const processWFO = async (wfo) => {
  const db = await openDatabase();
  const url = `https://www.weather.gov/source/${wfo}/ghwo/hazByCounty.json`;

  const shouldUpdate = await db
    .query("SELECT updated FROM weathergov_temp_ghwo_meta WHERE url=$1::text", [
      url,
    ])
    .then((result) => {
      // If we've fetched this URL before, let's check when it was last fetched.
      // This is specifically a dev optimization, where the interop layer could
      // restart quite frequently.
      if (result.rows.length > 0) {
        const updated = result.rows.pop().updated.getTime();
        const thirtyMinutesAgo = new Date(Date.now() - 1_800_000).getTime();

        // If the last update was less than 30 minutes ago, don't bother doing
        // it again yet.
        return thirtyMinutesAgo - updated > 0;
      }
      return true;
    });

  // If we've updated from this URL recently, we can bail out now.
  if (!shouldUpdate) {
    return;
  }

  const riskOverview = await fetchAPIJson(url);

  // After we fetch, update the database so we know the last time we fetched
  // from this URL.
  db.query(
    `INSERT INTO
    weathergov_temp_ghwo_meta
    (url,updated)
    VALUES($1::text,NOW())
    ON CONFLICT(url)
    DO UPDATE SET updated=NOW()`,
    [url],
  );

  if (riskOverview.error) {
    parentPort.postMessage({
      action: "log",
      level: "warn",
      message: `failed to get risk overview data for WFO ${wfo.toUpperCase()}`,
    });
  } else {
    if (!riskOverview.counties) {
      parentPort.postMessage({
        action: "log",
        level: "warn",
        message: `risk overview data for WFO ${wfo.toUpperCase()} does not have any counties`,
      });
    } else {
      // Since there are counties, process them. In the risk overview data, the
      // object keys are county FIPS codes and the values are the risk data. So
      // iterate over the key/value pairs and process accordingly.
      await Promise.all(
        Object.entries(riskOverview.counties).map(([countyFips, data]) =>
          processCounty({ countyFips, data, wfo }),
        ),
      );
    }

    if (!riskOverview.states) {
      parentPort.postMessage({
        action: "log",
        level: "warn",
        message: `risk overview data for WFO ${wfo.toUpperCase()} does not have any states`,
      });
    } else {
      // Do the same with states. In this case, the object key is the state two
      // letter abbreviation.
      await Promise.all(
        Object.entries(riskOverview.states).map(([state, data]) =>
          processState({ state, data, wfo }),
        ),
      );
    }
  }
};

export const updateRiskOverviews = async () => {
  parentPort.postMessage({
    action: "log",
    level: "info",
    message: "updating risk overview data",
  });

  const db = await openDatabase();

  const wfos = await db
    .query("SELECT wfo FROM weathergov_geo_cwas")
    .then(({ rows }) => rows.map(({ wfo }) => wfo.toLowerCase()));

  for await (const wfo of wfos) {
    await processWFO(wfo);
  }

  parentPort.postMessage({
    action: "log",
    level: "info",
    message: "finished updating risk overview data",
  });
};

const setTimer = () => {
  setTimeout(async () => {
    await updateRiskOverviews();
    setTimer();
    // Run every 30 minutes and one second. This is to create some buffer around
    // the update timestamp checking that happens later. This timing buffer is a
    // little bit messy, but this code is presumably temporary anyway.
  }, 1_801_000)
    // Tell Node not to keep a reference to this timer. Otherwise, Node will think
    // the process is still active forever. This is not an issue in production,
    // where we don't want the process to end, but in testing, we want the process
    // to quit cleanly when the Mocha tests are finished.
    .unref();
};

export const start = () => {
  parentPort.postMessage({
    action: "log",
    level: "verbose",
    message: "starting",
  });
  updateRiskOverviews().then(setTimer);
};

if (parentPort) {
  parentPort.on("message", ({ action }) => {
    switch (action.toLowerCase()) {
      case "start":
        start();
        break;

      default:
        break;
    }
  });
}
