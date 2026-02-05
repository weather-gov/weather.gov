import sinon from "sinon";
import { expect } from "chai";
import { AlertsCache } from "./cache.js";

const CURRENT_TEST_HASHES = ["one", "two", "three", "five", "seven"];

describe("AlertsCache tests", () => {
  let alertsCache;
  beforeEach(() => {
    alertsCache = new AlertsCache();
    alertsCache.db = global.test.database;

    // Throw if there are any un-mocked database calls. We want to catch
    // those because they aren't being controlled for or tested.
    global.test.database.query.rejects(new Error("Unexpected query"));
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

  describe("#add with land alert kind", () => {
    it("has GeoJSON shape", async () => {
      const hash = "ten";
      const alert = { some: "json-object" };
      const geometry = { shape: "geojson-object" };
      const kind = "land";

      // The actual query may be formatted differently, so we'll do some
      // regex-y magic to match it. First, accept whitespace at the start
      // or end.
      const query =
        `\\s*INSERT INTO ${alertsCache.tableName} (hash, alertJson, counties, states, alertKind, shape, shape_simplified) VALUES ($1, $2, $3, $4, $5, ST_TRANSFORM(ST_GeomFromGeoJson($6), 4326), ST_TRANSFORM(ST_GeomFromGeoJson($6), 4326) );\\s*`
          // Now turn any group of spaces into a whitespace match
          .replace(/\s+/g, "\\s+")
          // Escape parens since they are part of the query
          .replace(/\(/g, "\\(")
          .replace(/\)/g, "\\)")
          // And escape dollar signs, for the same reason
          .replace(/\$/g, "\\$");

      global.test.database.query
        .withArgs(
          // Turn it into a regex, with start/end anchors, and make it
          // multiline in case the input query is defined over several
          // lines.
          sinon.match(new RegExp(`^${query}$`, "m")),
          [hash, JSON.stringify(alert), "[]", "[]", kind, "geojson-object"],
        )
        .resolves();

      // After inserting the alert, which also computes the simplified shape,
      // we expect the alert JSON to be updated to include the geometry
      const setGeometryQuery = `\\s*UPDATE ${alertsCache.tableName}
      SET alertjson = jsonb_set(
        alertjson,
        '{geometry}',
        ST_AsGeoJSON(shape_simplified)::jsonb
      )
      WHERE hash=$1\\s*`
        // Now turn any group of spaces into a whitespace match
        .replace(/\s+/g, "\\s+")
        // Escape parens since they are part of the query
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        // And escape dollar signs, for the same reason
        .replace(/\$/g, "\\$");

      global.test.database.query
        .withArgs(sinon.match(new RegExp(`^${setGeometryQuery}$`, "m")), [hash])
        .resolves();

      return await alertsCache.add({
        hash,
        alert,
        geometry,
        alertKind: "land",
      });
    });

    it("has a spatial sub-query", async () => {
      const hash = "eleven";
      const alert = { some: "json-object" };
      const geometry = { sql: "magic subquery goes here" };
      const kind = "land";

      // The actual query may be formatted differently, so we'll do some
      // regex-y magic to match it. First, accept whitespace at the start
      // or end.
      const query =
        `\\s*INSERT INTO ${alertsCache.tableName} (hash, alertJson, counties, states, alertKind, shape, shape_simplified) VALUES ($1, $2, $3, $4, $5, (magic subquery goes here), ST_TRANSFORM( ST_SIMPLIFY( ST_TRANSFORM( (magic subquery goes here), 3857 ), 200 ), 4326 ) );\\s*`
          // Now turn any group of spaces into a whitespace match
          .replace(/ +/g, "\\s+")
          // Escape parens since they are part of the query
          .replace(/\(/g, "\\(")
          .replace(/\)/g, "\\)")
          // And escape dollar signs, for the same reason
          .replace(/\$/g, "\\$");

      global.test.database.query
        .withArgs(
          // Turn it into a regex, with start/end anchors, and make it
          // multiline in case the input query is defined over several
          // lines.
          sinon.match(new RegExp(`^${query}$`), "m"),
          [hash, JSON.stringify(alert), "[]", "[]", kind],
        )
        .resolves();

      // After inserting the alert, which also computes the simplified shape,
      // we expect the alert JSON to be updated to include the geometry
      const setGeometryQuery = `\\s*UPDATE ${alertsCache.tableName}
      SET alertjson = jsonb_set(
        alertjson,
        '{geometry}',
        ST_AsGeoJSON(shape_simplified)::jsonb
      )
      WHERE hash=$1\\s*`
        // Now turn any group of spaces into a whitespace match
        .replace(/\s+/g, "\\s+")
        // Escape parens since they are part of the query
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)")
        // And escape dollar signs, for the same reason
        .replace(/\$/g, "\\$");

      global.test.database.query
        .withArgs(sinon.match(new RegExp(`^${setGeometryQuery}$`, "m")), [hash])
        .resolves();

      return alertsCache.add({
        hash,
        alert,
        geometry,
        alertKind: "land",
      });
    });
  });

  it("#getIntersectingAlertsForPoint", async () => {
    const query = `SELECT alertjson FROM ${alertsCache.tableName} WHERE ST_INTERSECTS(ST_Buffer(ST_GeomFromText('POINT(3 1)',4326)::geography,111), shape);`;

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
    global.test.database.query.withArgs(query).resolves({ rows: output });

    const result = await alertsCache.getIntersectingAlertsForPoint(1, 3, {
      buffer: 111,
    });

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
