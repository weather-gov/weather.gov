import { expect } from "chai";
import { generateAlertGeometry } from "./geometry.js";
import { mochaGlobalSetup, mochaGlobalTeardown } from "../../mocha.js";

describe("alert geometries", () => {
  before(async () => {
    await mochaGlobalSetup();
  });

  after(async () => {
    await mochaGlobalTeardown();
  });

  describe("returns an existing geometry as-is", () => {
    it("when the geometry is not a geometry collection", async () => {
      const rawAlert = {
        geometry: "existing geometry",
      };

      const geometry = await generateAlertGeometry(
        global.test.database,
        rawAlert,
      );
      expect(geometry).to.eql({ shape: "existing geometry" });
    });

    it("when the geometry is a geometry collection", async () => {
      const rawAlert = {
        geometry: {
          type: "GeometryCollection",
          geometries: [
            "one",
            "two",
            { type: "GeometryCollection", geometries: ["three", "four"] },
          ],
        },
      };

      const geometry = await generateAlertGeometry(
        global.test.database,
        rawAlert,
      );
      expect(geometry).to.eql({
        shape: {
          type: "GeometryCollection",
          geometries: ["one", "two", "three", "four"],
        },
      });
    });
  });

  describe("with just one matching geometry from the database", () => {
    it("autogenerates a geometry from affected zones", async () => {
      const rawAlert = {
        geometry: false,
        properties: {
          affectedZones: ["zone 1", "zone 2", "zone 3"],
        },
      };

      global.test.database.query
        .withArgs(
          `SELECT COUNT(id) as count FROM weathergov_geo_zones WHERE id IN('zone 1','zone 2','zone 3')`,
        )
        .resolves({ rows: [{ count: 3 }] });

      const geometry = await generateAlertGeometry(
        global.test.database,
        rawAlert,
      );

      expect(geometry).to.eql({
        sql: `(
        SELECT
          ST_Union(shape) AS shape
        FROM (
          SELECT shape
          FROM weathergov_geo_zones
          WHERE id IN ('zone 1','zone 2','zone 3')
        ) AS zones
      )`,
      });
    });

    it("autogenerates a geometry from same geocodes if no zones are present", async () => {
      const rawAlert = {
        geometry: false,
        properties: {
          geocode: {
            // SAME code is FIPS code with a leading zero. The leading
            // zero gets stripped out, so we need to include it here
            // so we get what we expect later.
            SAME: ["0county 1", "0county 2", "0county 3"],
          },
        },
      };

      const geometry = await generateAlertGeometry(
        global.test.database,
        rawAlert,
      );
      // Our expectation also includes a check to ensure that the leading zero
      // was stripped from the SAME code in order to make it a FIPS code.
      expect(geometry).to.eql({
        sql: `(
        SELECT
          ST_Union(shape) AS shape
        FROM (SELECT shape
          FROM weathergov_geo_counties
          WHERE countyfips IN ('county 1','county 2','county 3')
        ) AS counties
      )`,
      });
    });

    it("falls back to counties if one or more zones are not present in our database", async () => {
      const rawAlert = {
        geometry: false,
        properties: {
          affectedZones: ["zone 1", "zone 2", "zone 3"],
          geocode: {
            // SAME code is FIPS code with a leading zero. The leading
            // zero gets stripped out, so we need to include it here
            // so we get what we expect later.
            SAME: ["0county 4", "0county 5"],
          },
        },
      };

      global.test.database.query
        .withArgs(
          `SELECT COUNT(id) as count FROM weathergov_geo_zones WHERE id IN('zone 1','zone 2','zone 3')`,
        )
        .resolves({ rows: [{ count: 1 }] });

      const geometry = await generateAlertGeometry(
        global.test.database,
        rawAlert,
      );

      expect(geometry).to.eql({
        sql: `(
        SELECT
          ST_Union(shape) AS shape
        FROM (SELECT shape
          FROM weathergov_geo_counties
          WHERE countyfips IN ('county 4','county 5')
        ) AS counties
      )`,
      });
    });
  });

  it("returns null geometry if no zones or different geocodes are present", async () => {
    const rawAlert = {
      geometry: false,
      properties: {},
    };

    const geometry = await generateAlertGeometry(
      global.test.database,
      rawAlert,
    );
    expect(geometry).to.be.null;
  });
});
