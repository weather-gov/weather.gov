const shapefile = require("shapefile");

const { dropIndexIfExists } = require("../lib/db.js");

const metadata = {
  table: "weathergov_geo_zones",
};

const schemas = {
  1: {
    schema: async (db) => {
      await db.query(`DROP TABLE IF EXISTS ${metadata.table}`);

      await db.query(
        `CREATE TABLE
        ${metadata.table}
        (
          id varchar(45) NOT NULL PRIMARY KEY,
          state VARCHAR(2),
          shape geometry(GEOMETRY) NOT NULL
        )`,
      );
    },
    data: null,
  },

  // Version 2: Change the shape column into a collection rather than a single
  // multipolygon. This allows us to capture all of the polygons for a zone as
  // a collection rather than trying to collect or union them into one entity.
  2: {
    schema: async (db) => {
      await db.query(
        `ALTER TABLE ${metadata.table}
ALTER COLUMN shape
SET DATA TYPE geometry(GEOMETRY),
ALTER COLUMN shape
SET NOT NULL`,
      );
    },
    data: async (db) => {
      await dropIndexIfExists(db, "zones_spatial_idx", metadata.table);
      await db.query(`TRUNCATE TABLE ${metadata.table}`);

      const found = new Map();

      const processFile = async (filename, zoneType) => {
        const file = await shapefile.open(filename);

        const getSqlForShape = async ({ done, value }) => {
          if (done) {
            return null;
          }

          const {
            properties: { STATE: state, ZONE: zone },
            geometry,
          } = value;

          const id = `https://api.weather.gov/zones/${zoneType}/${state}Z${zone}`;

          // Some of the zones are represented by multiple polygons. To handle that,
          // we'll gather a list of all polygons and insert them into the database
          // as a geometry collection.
          if (!found.has(id)) {
            found.set(id, {
              state,
              zone,
              zoneType,
              filename,
              geometry: [geometry],
            });
          } else {
            found.get(id).geometry.push(geometry);
          }

          return file.read().then(getSqlForShape);
        };

        await file.read().then(getSqlForShape);
      };

      await processFile(`./data/z_05mr24.shp`, "forecast");
      await processFile(`./data/fz05mr24.shp`, "fire");

      // Our map now contains entries for every zone. Iterate over that to insert
      // them into the database.
      for await (const [id, { state, geometry }] of found) {
        const featureCollection = {
          type: "FeatureCollection",
          features: geometry,
        };

        const geometryCollection = JSON.stringify(
          {
            type:"GeometryCollection",
            geometries: geometry
          }
        );
        
        await db.query(
          `INSERT INTO ${metadata.table}
          (id, state, shape)
          VALUES ('${id}', '${state}', ST_GeomFromGeoJSON('${geometryCollection}'));`
        );
      }

      await db.query(
        `CREATE INDEX zones_spatial_idx ON ${metadata.table} USING GIST(shape)`
      );
    },
  },

  // Add a spatial index.
  3: {
    schema: async (db) => {
      await dropIndexIfExists(db, "zones_spatial_idx", metadata.table);
      await db.query(
        `CREATE INDEX zones_spatial_idx ON ${metadata.table} USING GIST(shape)`
      );
    },
    data: null,
  },
};

module.exports = { ...metadata, schemas };
