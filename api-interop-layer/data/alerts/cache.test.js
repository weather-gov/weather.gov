import sinon from "sinon";
import { expect } from "chai";
import { AlertsCache } from "./cache.js";

const CURRENT_TEST_HASHES = [
  "one",
  "two",
  "three",
  "five",
  "seven"
];

describe("AlertsCache tests", () => {
  let alertsCache;
  beforeEach(() => {
    alertsCache = new AlertsCache();
    alertsCache.db = global.test.database;
  });
  it("#createTable", async () => {
    const partOfQuery = "CREATE TABLE IF NOT EXISTS weathergov_geo_alerts_cache";
    global.test.database.query
      .withArgs(sinon.match(partOfQuery))
      .resolves(true);

    const result = await alertsCache.createTable();

    expect(result).to.equal(true);
  });

  it("#getHashes", async () => {
    const query = `SELECT hash FROM ${alertsCache.tableName}`;
    global.test.database.query
      .withArgs(sinon.match(query))
      .resolves([
        CURRENT_TEST_HASHES.map(hash => {
          return { hash };
        })
      ]);

    const result = await alertsCache.getHashes();

    expect(result).to.eql(CURRENT_TEST_HASHES);
  });

  it("#determineOldHashesFrom", () => {
    const current = CURRENT_TEST_HASHES;
    const incoming = ["two", "three", "four", "five"];
    const expected = ["one", "seven"];

    const actual = alertsCache.determineOldHashesFrom(
      current,
      incoming
    );

    expect(actual).to.eql(expected);
  });

  it("#determineNewHashesFrom", () => {
    const current = CURRENT_TEST_HASHES;
    const incoming = ["two", "three", "four", "five", "zero"];
    const expected = ["four", "zero"];

    const actual = alertsCache.determineNewHashesFrom(
      current,
      incoming
    );

    expect(actual).to.eql(expected);
  });

  it("#removeByHashes", async () => {
    const toRemove = ["two", "three", "five"];
    const query = `DELETE FROM ${alertsCache.tableName} WHERE hash IN (?, ?, ?);`;
    global.test.database.query
      .withArgs(query, toRemove)
      .resolves(true);

    const result = await alertsCache.removeByHashes(toRemove);

    expect(result).to.be.true;
  });

  it("#add (with land alert kind)", async () => {
    const hash = "ten";
    const alert = { some: "json-object"};
    const geometry = { some: "geojson-object"};
    const kind = "land";

    const query = `INSERT INTO ${alertsCache.tableName} (hash, alertJson, shape, alertKind) VALUES(?, ?, ST_GeomFromGeoJson(?), ?);`;
    
    global.test.database.query
      .withArgs(query, [hash, JSON.stringify(alert), JSON.stringify(geometry), kind])
      .resolves("INSERT WORKED");

    const actual = await alertsCache.add(hash, alert, geometry, "land");

    expect(actual).to.equal("INSERT WORKED");
  });

  it("#getIntersectingAlerts", async () => {
    const query = `SELECT alertJson, ST_AsGeoJson(shape) as geometry FROM ${alertsCache.tableName} WHERE ST_INTERSECTS(ST_GeomFromGeoJson(?), shape);`;
    const geoJson = { "this-is": "some-geojson" };
    const output = [
      {
        alertJson: {name: "alert1"},
        "geometry": "geometry1"
      },
      {
        alertJson:{name: "alert2"},
        "geometry": "geometry2"
      }
    ];
    const expected = [
      {
        name: "alert1",
        geometry: "geometry1"
      },
      {
        name: "alert2",
        geometry: "geometry2"
      }
    ];
    global.test.database.query
      .withArgs(query, [geoJson])
      .resolves([output]);

    const result = await alertsCache.getIntersectingAlerts(geoJson);

    expect(result).to.eql(expected);
  });

  it("#dropCacheTable", async () => {
    const query = `DROP TABLE IF EXISTS ${alertsCache.tableName}`;
    global.test.database.query
      .withArgs(query)
      .resolves("TABLE DROPPED");

    const result = await alertsCache.dropCacheTable();

    expect(result).to.equal("TABLE DROPPED");
  });
});
