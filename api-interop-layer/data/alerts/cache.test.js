import sinon from "sinon";
import { expect } from "chai";
import { AlertsCache } from "./cache.js";

const CURRENT_TEST_HASHES = ["one", "two", "three", "five", "seven"];

describe("AlertsCache tests", () => {
  let alertsCache;
  beforeEach(() => {
    alertsCache = new AlertsCache();
    alertsCache.db = global.test.database;
  });

  it("#getHashes", async () => {
    const query = `SELECT hash FROM ${alertsCache.tableName}`;
    global.test.database.query.withArgs(sinon.match(query)).resolves({
      rows: CURRENT_TEST_HASHES.map((hash) => ({ hash })),
    });

    const result = await alertsCache.getHashes();

    expect(result).to.eql(CURRENT_TEST_HASHES);
  });

  it("#determineOldHashesFrom", () => {
    const current = CURRENT_TEST_HASHES;
    const incoming = ["two", "three", "four", "five"];
    const expected = ["one", "seven"];

    const actual = alertsCache.determineOldHashesFrom(current, incoming);

    expect(actual).to.eql(expected);
  });

  it("#determineNewHashesFrom", () => {
    const current = CURRENT_TEST_HASHES;
    const incoming = ["two", "three", "four", "five", "zero"];
    const expected = ["four", "zero"];

    const actual = alertsCache.determineNewHashesFrom(current, incoming);

    expect(actual).to.eql(expected);
  });

  describe("#removeByHashes", () => {
    it("with no hashes", async () => {
      const result1 = await alertsCache.removeByHashes([]);
      expect(result1).to.eql([]);

      const result2 = await alertsCache.removeByHashes(17);
      expect(result2).to.eql([]);

      const result3 = await alertsCache.removeByHashes("hello");
      expect(result3).to.eql([]);
    });

    it("with just one hash", async () => {
      const toRemove = ["one"];
      const query = `DELETE FROM ${alertsCache.tableName} WHERE hash IN ($1)`;
      global.test.database.query.withArgs(query, toRemove).resolves(true);

      const result = await alertsCache.removeByHashes(toRemove);

      expect(result).to.be.true;
    });

    it("with multiple hashes", async () => {
      const toRemove = ["two", "three", "five"];
      const query = `DELETE FROM ${alertsCache.tableName} WHERE hash IN ($1,$2,$3)`;
      global.test.database.query.withArgs(query, toRemove).resolves(true);

      const result = await alertsCache.removeByHashes(toRemove);

      expect(result).to.be.true;
    });
  });

  it("#add (with land alert kind)", async () => {
    const hash = "ten";
    const alert = { some: "json-object" };
    const geometry = { some: "geojson-object" };
    const kind = "land";

    const query = `INSERT INTO ${alertsCache.tableName} (hash, alertJson, shape, alertKind) VALUES($1, $2, ST_TRANSFORM(ST_GeomFromGeoJson($3), 4326), $4);`;

    global.test.database.query
      .withArgs(query, [hash, JSON.stringify(alert), geometry, kind])
      .resolves("INSERT WORKED");

    const actual = await alertsCache.add(hash, alert, geometry, "land");

    expect(actual).to.equal("INSERT WORKED");
  });

  it("#getIntersectingAlerts", async () => {
    const query = `SELECT alertJson, ST_AsGeoJson(shape) as geometry FROM ${alertsCache.tableName} WHERE ST_INTERSECTS(ST_Buffer(ST_GeomFromText('POINT(3 1)',4326)::geography,298), shape);`;

    const output = [
      {
        alertjson: { name: "alert1" },
        geometry: JSON.stringify({ name: "geometry1" }),
      },
      {
        alertjson: { name: "alert2" },
        geometry: JSON.stringify({ name: "geometry2" }),
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
    global.test.database.query.withArgs(query).resolves({ rows: output });

    const result = await alertsCache.getIntersectingAlerts(1, 3, {
      buffer: 298,
    });

    expect(result).to.eql(expected);
  });

  it("#dropCacheTable", async () => {
    const query = `DROP TABLE IF EXISTS ${alertsCache.tableName}`;
    global.test.database.query.withArgs(query).resolves("TABLE DROPPED");

    const result = await alertsCache.dropCacheTable();

    expect(result).to.equal("TABLE DROPPED");
  });
});
