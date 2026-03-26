import { parentPort } from "node:worker_threads";
import openDatabase from "../db.js";
import {
  addRisksToResult,
  processDays,
  processLegend,
  processChickletData,
} from "./processing.js";
import { logger } from "../../util/monitoring/index.js";
import { requestJSON } from "../../util/request.js";
import { Client } from "undici";

const riskOverviewLogger = logger.child({ subsystem: "risk overview" });

const BASE_GHWO_URL = process.env.GHWO_URL ?? "https://www.weather.gov";
const client = new Client(BASE_GHWO_URL, { pipelining: 2, allowH2: true });

// enum to track WFO ghwo processing status
const wfoStatus = Object.freeze({
  NO_DATA: "NO_DATA",
  NO_STATES: "NO_STATES",
  NO_COUNTIES: "NO_COUNTIES",
  ALL_DATA: "ALL_DATA",
});

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

const processState = async ({
  state,
  data: stateData,
  wfo,
  legend,
  chicklet,
}) => {
  const db = await openDatabase();
  const stateName = await db
    .query("SELECT name FROM weathergov_geo_states WHERE state=$1::text", [
      state,
    ])
    .then(({ rows }) => rows.pop().name);

  const { days, noRisks } = processDays(stateData, legend);

  const data = {
    state: stateName,
    days,
    wfo,
    noRisks,
  };

  addRisksToResult(data, wfo, days, legend, chicklet);

  await upsert(state, data);
};

const processCounty = async ({
  countyFips,
  data: countyData,
  wfo,
  legend,
  chicklet,
}) => {
  const db = await openDatabase();
  const county = db
    .query(
      "SELECT st,countyname FROM weathergov_geo_counties WHERE countyfips=$1::text",
      [countyFips],
    )
    .then(({ rows }) => rows.pop());

  const { days, noRisks } = processDays(countyData, legend);

  const data = {
    state: county.st,
    county: county.countyname,
    fips: countyFips,
    wfo,
    noRisks,
  };

  addRisksToResult(data, wfo, days, legend, chicklet);

  await upsert(countyFips, data);
};

const processWFO = async (wfo, statuses) => {
  const db = await openDatabase();

  const risksEndpoint = `/source/${wfo}/ghwo/hazByCounty.json`;
  const legendEndpoint = `/source/${wfo}/ghwo/legend.json`;
  const chickletEndpoint = `/source/${wfo}/ghwo/chicklet.json`;

  const shouldUpdate = await db
    .query("SELECT updated FROM weathergov_temp_ghwo_meta WHERE url=$1::text", [
      risksEndpoint,
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
    return statuses;
  }

  riskOverviewLogger.trace(
    { BASE_GHWO_URL, risksEndpoint, legendEndpoint },
    "making risk overview requests",
  );

  try {
    const [riskOverview, legendData, chickletData] = await Promise.all([
      requestJSON(client, risksEndpoint, { "wx-host": "www.weather.gov" }),
      requestJSON(client, legendEndpoint, { "wx-host": "www.weather.gov" }),
      requestJSON(client, chickletEndpoint, { "wx-host": "www.weather.gov" }),
    ]);

    // After we fetch, update the database so we know the last time we fetched
    // from this URL.
    await db.query(
      `INSERT INTO weathergov_temp_ghwo_meta (url, updated)
       VALUES($1::text, NOW())
       ON CONFLICT(url) DO UPDATE SET updated=NOW()`,
      [risksEndpoint],
    );

    // We get legend data, and now we need to manipulate it into a shape that
    // is more useful for us later on.
    const legend = processLegend(legendData);

    // We process the chicklet data into a dictionary more
    // amenable to lookups by risk keys
    const chicklet = processChickletData(chickletData);

    if (riskOverview.counties) {
      // Since there are counties, process them. In the risk overview data, the
      // object keys are county FIPS codes and the values are the risk data. So
      // iterate over the key/value pairs and process accordingly.
      await Promise.all(
        Object.entries(riskOverview.counties).map(([countyFips, data]) =>
          processCounty({ countyFips, data, wfo, legend, chicklet }),
        ),
      );
    }

    if (riskOverview.states) {
      // Do the same with states. In this case, the object key is the state two
      // letter abbreviation.
      await Promise.all(
        Object.entries(riskOverview.states).map(([state, data]) =>
          processState({ state, data, wfo, legend, chicklet }),
        ),
      );
    }

    // categorize this WFO ghwo data into one of four status buckets.
    if (riskOverview.states) {
      if (riskOverview.counties) {
        statuses[wfoStatus.ALL_DATA].push(wfo);
      } else {
        statuses[wfoStatus.NO_COUNTIES].push(wfo);
      }
    } else {
      if (riskOverview.counties) {
        statuses[wfoStatus.NO_STATES].push(wfo);
      } else {
        statuses[wfoStatus.NO_DATA].push(wfo);
      }
    }
  } catch (err) {
    // If requestJSON throws, it lands here
    if (err.cause?.statusCode === 404 || err.statusCode === 404) {
      riskOverviewLogger.trace(
        { wfo, endpoint: err.url || risksEndpoint },
        "GHWO data not available for this office",
      );
    } else
      riskOverviewLogger.error(
        { err, wfo },
        "Failed to fetch risk or legend data due to a system error",
      );
    statuses[wfoStatus.NO_DATA].push(wfo);
    return statuses;
  }
  return statuses;
};

export const updateRiskOverviews = async () => {
  riskOverviewLogger.info("updating risk overview data");

  const db = await openDatabase();

  const wfos = await db
    .query("SELECT wfo FROM weathergov_geo_cwas")
    .then(({ rows }) => rows.map(({ wfo }) => wfo.toLowerCase()));

  let statuses = {};
  for (const key of Object.keys(wfoStatus)) {
    statuses[key] = [];
  }

  for await (const wfo of wfos) {
    statuses = await processWFO(wfo, statuses);
  }

  for (const key of Object.keys(wfoStatus)) {
    if (statuses[key].length) {
      const status = {
        [wfoStatus.ALL_DATA]: "successfully retrieved all data",
        [wfoStatus.NO_COUNTIES]: "could not get county data",
        [wfoStatus.NO_STATES]: "could not get state data",
        [wfoStatus.NO_DATA]: "failed to get any data",
      }[key];
      if (key == wfoStatus.ALL_DATA) {
        riskOverviewLogger.info({ status, wfos: statuses[key] });
      } else {
        riskOverviewLogger.warn({ status, wfos: statuses[key] });
      }
    }
  }
};

let timer;

const setTimer = () => {
  timer = setTimeout(async () => {
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
  updateRiskOverviews().then(setTimer);
};

if (parentPort) {
  parentPort.on("message", ({ action }) => {
    switch (action.toLowerCase()) {
      case "start":
        start();
        break;
      case "shutdown":
        clearTimeout(timer);
        process.exit();
        break;
      default:
        break;
    }
  });
}
