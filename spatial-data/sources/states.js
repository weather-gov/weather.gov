const shapefile = require("shapefile");

const metadata = {
  table: "weathergov_geo_states",
};

const schemas = {
  1: {
    schema: async (db) => {
      await db.query(`DROP TABLE IF EXISTS ${metadata.table}`);

      await db.query(
        `CREATE TABLE
        ${metadata.table}
        (
          id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
          state VARCHAR(2),
          name TEXT,
          fips VARCHAR(2),
          shape MULTIPOLYGON NOT NULL
        )`,
      );
    },
    data: async (db) => {
      const file = await shapefile.open(`./data/s_05mr24.shp`);

      await db.query("TRUNCATE TABLE weathergov_geo_states");
      await db.query("ALTER TABLE weathergov_geo_states AUTO_INCREMENT=0");

      const getSqlForShape = async ({ done, value }) => {
        if (done) {
          return null;
        }

        const {
          properties: { STATE: state, NAME: name, FIPS: fips },
          geometry,
        } = value;

        if (geometry.type === "Polygon") {
          geometry.type = "MultiPolygon";
          geometry.coordinates = [geometry.coordinates];
        }

        // These shapefiles are in NAD83, whose SRID is 4269.
        geometry.crs = { type: "name", properties: { name: "EPSG:4269" } };

        await db.query(
          `INSERT INTO weathergov_geo_states
            (state,name,fips,shape)
            VALUES(
              '${state}',
              '${name}',
              '${fips}',
              ST_GeomFromGeoJSON('${JSON.stringify(geometry)}'))`,
        );

        return file.read().then(getSqlForShape);
      };

      await file.read().then(getSqlForShape);

      await db.query(
        "CREATE SPATIAL INDEX states_spatial_idx ON weathergov_geo_states(shape)",
      );
    },
  },
};

module.exports = { ...metadata, schemas };
