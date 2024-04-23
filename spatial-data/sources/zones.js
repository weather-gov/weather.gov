const shapefile = require("shapefile");

const { dropIndexIfExists, openDatabase } = require("../lib/db.js");

const metadata = {
  table: "weathergov_geo_zones",
  version: 1,
};

module.exports = async () => {
  console.log("loading zones...");
  const db = await openDatabase();

  await db.query(
    `CREATE TABLE IF NOT EXISTS
      ${metadata.table}
      (
        id varchar(45) NOT NULL PRIMARY KEY,
        state VARCHAR(2),
        shape MULTIPOLYGON NOT NULL
      )`,
  );

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

      if (geometry.type === "Polygon") {
        geometry.type = "MultiPolygon";
        geometry.coordinates = [geometry.coordinates];
      }
      // These shapefiles are in NAD83, whose SRID is 4269.
      geometry.crs = { type: "name", properties: { name: "EPSG:4269" } };

      const id = `https://api.weather.gov/zones/${zoneType}/${state}Z${zone}`;

      // Some of the zones are duplicated. Dunno why. Don't put them in twice,
      // the database will scream.
      if (!found.has(id)) {
        found.set(id, { state, zone, zoneType, filename, geometry });

        await db.query(
          `INSERT INTO weathergov_geo_zones
            (id, state, shape)
            VALUES(
              '${id}',
              '${state}',
              ST_GeomFromGeoJSON('${JSON.stringify(geometry)}')
            )`,
        );
      }
      return file.read().then(getSqlForShape);
    };

    await file.read().then(getSqlForShape);
  };

  await processFile(`./z_05mr24.shp`, "forecast");
  await processFile(`./fz05mr24.shp`, "fire");

  db.end();
};

module.exports.metadata = metadata;
