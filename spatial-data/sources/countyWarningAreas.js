const shapefile = require("shapefile");

const { dropIndexIfExists, openDatabase } = require("../lib/db.js");

const metadata = {
  table: "weathergov_geo_cwas",
};

const schemas = {
  1: async () => {
    const db = await openDatabase();

    await db.query(`
      CREATE TABLE IF NOT EXISTS
       ${metadata.table}
       (
          id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
         wfo VARCHAR(3),
         cwa VARCHAR(3),
         region VARCHAR(2),
         city VARCHAR(50),
         state VARCHAR(50),
         st VARCHAR(2),
         shape MULTIPOLYGON NOT NULL
      )`);

    await db.end();

    return true;
  },
};

const loadData = async () => {
  console.log("  loading WFOs/CWAs data");
  const db = await openDatabase();

  const file = await shapefile.open(`./data/w_05mr24.shp`);

  await dropIndexIfExists(db, "cwas_spatial_idx", "weathergov_geo_cwas");
  await db.query("TRUNCATE TABLE weathergov_geo_cwas");
  await db.query("ALTER TABLE weathergov_geo_cwas AUTO_INCREMENT=0");

  const getSqlForShape = async ({ done, value }) => {
    if (done) {
      return null;
    }

    const {
      properties: {
        WFO: wfo,
        CWA: cwa,
        REGION: region,
        CITY: city,
        STATE: state,
        ST: st,
      },
      geometry,
    } = value;

    if (geometry.type === "Polygon") {
      geometry.type = "MultiPolygon";
      geometry.coordinates = [geometry.coordinates];
    }

    // These shapefiles are in NAD83, whose SRID is 4269.
    geometry.crs = { type: "name", properties: { name: "EPSG:4269" } };

    await db.query(`INSERT INTO weathergov_geo_cwas
            (wfo, cwa, region, city, state, st, shape)
            VALUES(
              '${wfo}',
              '${cwa}',
              '${region}',
              '${city}',
              '${state}',
              '${st}',
              ST_GeomFromGeoJSON('${JSON.stringify(geometry)}'));`);

    return file.read().then(getSqlForShape);
  };

  await file.read().then(getSqlForShape);

  await db.query(
    "CREATE SPATIAL INDEX cwas_spatial_idx ON weathergov_geo_cwas(shape)",
  );

  db.end();
};

module.exports = { ...metadata, schemas, loadData };
