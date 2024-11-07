const shapefile = require("shapefile");

const { dropIndexIfExists, openDatabase } = require("../lib/db.js");

const metadata = {
  table: "weathergov_geo_zones",
};

const schemas = {
  1: async () => {
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
    await db.end();
    return true;
  },

  // No schema change, but need to reload data.
  2: async () => {
    const db = await openDatabase();
    // Version 2: Change the shape column into a collection rather than a single
    // multipolygon. This allows us to capture all of the polygons for a zone as
    // a collection rather than trying to collect or union them into one entity.
    await db.query(
      `ALTER TABLE ${metadata.table} MODIFY shape GEOMETRYCOLLECTION NOT NULL`,
    );
    await db.end();

    return true;
  },

  3: async () => {
    const db = await openDatabase();
    await db.query(
      `ALTER TABLE ${metadata.table} MODIFY shape GEOMETRYCOLLECTION NOT NULL`,
    );
    await dropIndexIfExists(db, "zones_spatial_idx", metadata.table);
    await db.query(
      `CREATE SPATIAL INDEX zones_spatial_idx ON ${metadata.table}(shape)`,
    );
    await db.end();

    // No data load needed, just creating the index.
    return false;
  },
};

const loadData = async () => {
  console.log("  loading zones data");
  const db = await openDatabase();

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

  await processFile(`./z_05mr24.shp`, "forecast");
  await processFile(`./fz05mr24.shp`, "fire");

  // Our map now contains entries for every zone. Iterate over that to insert
  // them into the database.
  for await (const [id, { state, geometry }] of found) {
    const featureCollection = {
      type: "FeatureCollection",
      features: geometry,
      // Shapefiles are in NAD83, whose SRID is 4269. Set that at the collection
      // level so that it automatically applies to all contained shapes.
      crs: { type: "name", properties: { name: "EPSG:4269" } },
    };

    await db.query(
      `INSERT INTO ${metadata.table}
      (id, state, shape)
      VALUES(
        '${id}',
        '${state}',
        ST_GeomFromGeoJSON('${JSON.stringify(featureCollection)}')
      )`,
    );
  }

  await db.query(
    `CREATE SPATIAL INDEX zones_spatial_idx ON ${metadata.table}(shape)`,
  );

  db.end();
};

module.exports = { ...metadata, schemas, loadData };
