import sinon from "sinon";
import { expect } from "chai";
import {
  generateAlertGeometry,
  ZONE_CHUNK_SIZE,
} from "./geometry.js";

describe("alert geometries", () => {
  describe("returns an existing geometry as-is", () => {
    it("when the geometry is not a geometry collection", async () => {
      const rawAlert = {
        geometry: "existing geometry",
      };

      const geometry = await generateAlertGeometry(
        global.test.database,
        rawAlert,
      );
      expect(geometry).to.equal("existing geometry");
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
        type: "GeometryCollection",
        geometries: ["one", "two", "three", "four"],
      });
    });
  });

  describe("with just one matching geometry from the database", () => {
    const shape = {
      type: "GeometryCollection",
      geometries: [
        {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
      ],
    };

    it("autogenerates a geometry from affected zones", async () => {
      const affectedZones = ["zone 1", "zone 2", "zone 3"];
      const rawAlert = {
        geometry: false,
        properties: {
          affectedZones,
        },
      };

      const query = `
      SELECT ST_ASGEOJSON(
        ST_COLLECT(shape)
      )
        AS shape
        FROM weathergov_geo_zones
        WHERE id IN (?,?,?)`;
      global.test.database.query
        .withArgs(sinon.match(query), affectedZones)
        .resolves([
          [
            {
              shape,
            },
          ],
        ]);

      const geometry = await generateAlertGeometry(
        global.test.database,
        rawAlert,
      );

      expect(geometry).to.eql(shape);
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

      const query = `
      SELECT ST_ASGEOJSON(
        ST_COLLECT(shape)
      )
        AS shape
        FROM weathergov_geo_counties
        WHERE countyFips IN (?,?,?)`;
      global.test.database.query
        .withArgs(sinon.match(query), ["county 1", "county 2", "county 3"])
        .resolves([[{ shape }]]);

      const geometry = await generateAlertGeometry(
        global.test.database,
        rawAlert,
      );
      expect(geometry).to.eql(shape);
    });
  });

  describe("with multiple matching geometry from the database", () => {
    const shape = {
      type: "GeometryCollection",
      geometries: [
        {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
        {
          type: "Polygon",
          coordinates: [
            [
              [1, 0],
              [1, 1],
              [2, 1],
              [2, 0],
              [1, 0],
            ],
          ],
        },
      ],
    };

    const expected = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [2, 0],
            [2, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      },
    };

    it("autogenerates a geometry from affected zones", async () => {
      const affectedZones = ["zone 1", "zone 2", "zone 3"];
      const rawAlert = {
        geometry: false,
        properties: {
          affectedZones,
        },
      };

      const query = `
      SELECT ST_ASGEOJSON(
        ST_COLLECT(shape)
      )
        AS shape
        FROM weathergov_geo_zones
        WHERE id IN (?,?,?)`;
      global.test.database.query
        .withArgs(sinon.match(query), affectedZones)
        .resolves([
          [
            {
              shape,
            },
          ],
        ]);

      const geometry = await generateAlertGeometry(
        global.test.database,
        rawAlert,
      );
      expect(geometry).to.eql(expected);
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

      const query = `
      SELECT ST_ASGEOJSON(
        ST_COLLECT(shape)
      )
        AS shape
        FROM weathergov_geo_counties
        WHERE countyFips IN (?,?,?)`;
      global.test.database.query
        .withArgs(sinon.match(query), ["county 1", "county 2", "county 3"])
        .resolves([[{ shape }]]);

      const geometry = await generateAlertGeometry(
        global.test.database,
        rawAlert,
      );
      expect(geometry).to.eql(expected);
    });
  });

  describe("Zone chunking tests", () => {
    // Begin with  a total zone size that is just a little above the
    // zone chunk size, so we have 3.x chunks
    const numChunks = (ZONE_CHUNK_SIZE * 3) + (ZONE_CHUNK_SIZE - 1);
    const shape = {
      type: "GeometryCollection",
      geometries: [
        {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [1, 0],
              [0, 0],
            ],
          ],
        },
      ],
    };
    const zones = Array(numChunks).map((_, idx) => `zone ${idx + 1}`);
    const alert = {
      geometry: false,
      properties: {
        affectedZones: zones,
      },
    };

    it("Calls the chunked db function the correct number of times for 3.x chunks (4)", async () => {
      global.test.database.query.resolves([[{shape}]]);

      await generateAlertGeometry(global.test.database, alert);

      const expected = 4;
      const actual = global.test.database.query.callCount;
      

      expect(actual).to.equal(expected);
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
