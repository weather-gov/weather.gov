import { parentPort } from "node:worker_threads";
import openDatabase from "../db.js";
import { fetchAPIJson } from "../../util/fetch.js";
import {
  riskNameToImageNameMap,
  riskNameToKeyMapping,
  maxLevelPerRisk,
} from "./mappings.js";

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
// that data instead of an object.c
const processDays = (data, legend) => {
  // Get the keys that are timestamps.
  const days = Object.keys(data)
    .filter((key) =>
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[-+]\d{2}:\d{2}$/.test(key),
    )
    .map((timestamp, index) => ({
      risks: Object.entries(data[timestamp])
        // We don't do anything with the DailyComposite. We'll make our own.
        .filter(([risk]) => risk !== "DailyComposite")
        .reduce(
          (risks, [risk, category]) => ({
            ...risks,
            [risk]: {
              // Grab all the legend information for this risk and category
              // and stuff it into this risk entry for the day.
              ...legend[risk]?.category[category],
              // Also preserve the raw category, as well as the risk name from
              // the legend.
              category,
              name: legend[risk]?.name,
            },
          }),
          {},
        ),
      dayNumber: index + 1,
      timestamp,
      images: {},
    }));

  // For each day, compute a composite risk category/level.
  days.forEach((day) => {
    // Extract all of the categories for the day, along with the max
    // for each of those risks.
    const categories = Object.entries(day.risks).map(([key, { category }]) => ({
      category,
      max: maxLevelPerRisk.get(key),
    }));

    // Now scale the category relative to its max.
    const scaled = categories.map(({ category, max }) => category / max);

    // Finally, set the composite to the highest category and the
    // highest scaled value.
    day.composite = {
      max: Math.max(...categories.map(({ category }) => category)),
      scaled: Math.round(Math.max(...scaled) * 100) / 100,
    };
  });

  return days;
};

const processState = async ({ state, data: stateData, wfo, legend }) => {
  const db = await openDatabase();
  const stateName = await db
    .query("SELECT name FROM weathergov_geo_states WHERE state=$1::text", [
      state,
    ])
    .then(({ rows }) => rows.pop().name);

  const data = {
    state: stateName,
    days: processDays(stateData, legend),
    wfo,
  };

  await upsert(state, data);
  parentPort.postMessage({
    action: "log",
    level: "verbose",
    message: `updated risk overview for state ${state} (${stateName}) from WFO ${wfo.toUpperCase()}`,
  });
};

const processCounty = async ({ countyFips, data: countyData, wfo, legend }) => {
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
    days: processDays(countyData, legend),
    wfo,
  };

  data.days.forEach((day) => {
    // For every data element in the risk overview, we want to also provide an
    // image URL. The list of data elements is not the same for all WFOs at all
    // times, so we need to build this dynamically.
    const elementKeys = Object.keys(day.risks);
    for (const elementKey of elementKeys) {
      // Sometimes the element key (like "SevereThunderstorm") is not the same
      // key as used in the URL (in this case, "SevereThunderstorms" - note
      // the s at the end). If we have a URL key mapped to the element key,
      // use it. Otherwise just preserve the element key.
      const urlKey = riskNameToImageNameMap.get(elementKey) ?? elementKey;
      // Build the image URL from the WFO, element key, and day number.
      day.images[elementKey] =
        `https://www.weather.gov/images/${wfo}/ghwo/${urlKey}Day${day.dayNumber}.jpg`;
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
  const risksUrl = `https://www.weather.gov/source/${wfo}/ghwo/hazByCounty.json`;
  const legendUrl = `https://www.weather.gov/source/${wfo}/ghwo/legend.json`;

  const shouldUpdate = await db
    .query("SELECT updated FROM weathergov_temp_ghwo_meta WHERE url=$1::text", [
      risksUrl,
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

  const [riskOverview, legendData] = await Promise.all([
    fetchAPIJson(risksUrl),
    fetchAPIJson(legendUrl),
  ]);

  // After we fetch, update the database so we know the last time we fetched
  // from this URL.
  db.query(
    `INSERT INTO
    weathergov_temp_ghwo_meta
    (url,updated)
    VALUES($1::text,NOW())
    ON CONFLICT(url)
    DO UPDATE SET updated=NOW()`,
    [risksUrl],
  );

  if (riskOverview.error) {
    parentPort.postMessage({
      action: "log",
      level: "warn",
      message: `failed to get risk overview data for WFO ${wfo.toUpperCase()}`,
    });
  } else {
    // We get legend data, and now we need to manipulate it into a shape that
    // is more useful for us later on.
    const legend = legendData.hazards.reduce((all, hazard) => {
      // We need to map the risk names from the legend into the risk keys in
      // the actual data. We have a mapping that covers all the risks we know
      // about right now, but as a stopgap for risks we don't know about, we
      // will try to convert hazard names into keys based on how it tends to go.
      //
      // We have asked GHWO to add this mapping into the legend metadata
      // for us, so hopefully we can switch over to that before long.
      const key = riskNameToKeyMapping.has(hazard.name)
        ? riskNameToKeyMapping.get(hazard.name)
        : hazard.name.replace(/ Risk$/, "").replace(/[^a-z]/gi, "");

      return {
        ...all,
        // Use the risk key as the key here, for faster lookup later. This lets
        // us quickly find the risk name and category information from the legend.
        [key]: {
          name: hazard.name,
          category: hazard.category,
        },
      };
    }, {});

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
          processCounty({ countyFips, data, wfo, legend }),
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
          processState({ state, data, wfo, legend }),
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
