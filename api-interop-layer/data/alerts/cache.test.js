import sinon from "sinon";
import { expect } from "chai";
import { AlertsCache } from "./cache.js";

describe("AlertsCache tests", () => {
  let alertsCache;
  beforeEach(() => {
    alertsCache = new AlertsCache();
    alertsCache.db = global.test.database;

    // Throw if there are any un-mocked database calls. We want to catch
    // those because they aren't being controlled for or tested.
    global.test.database.query.rejects(new Error("Unexpected query"));
  });

  after(() => {
    global.test.database.query.reset();
  });

  it("#getIntersectingAlertsForPoint", async () => {
    const query =
      `\\s*SELECT alertjson FROM ${alertsCache.tableName} WHERE ST_DWithin( ST_SetSRID(ST_Point($2, $1), 4326)::geography, shape_simplified::geography, 400, false )\\s*`
        // Now turn any group of spaces into a whitespace match
        .replace(/\s+/g, "\\s+")
        // Escape parens since they are part of the query
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        // And escape dollar signs, for the same reason
        .replace(/\$/g, "\\$");

    const output = [
      {
        alertjson: { name: "alert1", geometry: { name: "geometry1" } },
      },
      {
        alertjson: { name: "alert2", geometry: { name: "geometry2" } },
      },
    ];
    const expected = [
      {
        name: "alert1",
        geometry: { name: "geometry1" },
      },
      {
        name: "alert2",
        geometry: { name: "geometry2" },
      },
    ];

    global.test.database.query
      .withArgs(sinon.match(new RegExp(`^${query}$`, "m")), [1, 3])
      .resolves({ rows: output });

    const result = await alertsCache.getIntersectingAlertsForPoint(1, 3);
    expect(result).to.eql(expected);
  });

  it("#getAlertsForCountyFIPS", async () => {
    const query = `SELECT alertjson FROM ${alertsCache.tableName} WHERE counties::jsonb ? $1`;

    const output = [
      {
        alertjson: { name: "alert1", geometry: { name: "geometry1" } },
      },
      {
        alertjson: { name: "alert2", geometry: { name: "geometry2" } },
      },
    ];
    const expected = [
      {
        name: "alert1",
        geometry: { name: "geometry1" },
      },
      {
        name: "alert2",
        geometry: { name: "geometry2" },
      },
    ];
    global.test.database.query
      .withArgs(query, ["55443"])
      .resolves({ rows: output });

    const result = await alertsCache.getAlertsForCountyFIPS("55443");

    expect(result).to.eql(expected);
  });
});
