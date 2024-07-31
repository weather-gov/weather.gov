const shapefile = require("shapefile");
const { table: statesTable } = require("./states.js");
const { dropIndexIfExists, openDatabase } = require("../lib/db.js");

const metadata = {
  table: "weathergov_geo_counties",
};

const schemas = {
  1: async () => {
    const db = await openDatabase();

    await db.query(
      `CREATE TABLE IF NOT EXISTS
        ${metadata.table}
        (
          id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
          state VARCHAR(2),
          stateName TEXT,
          stateFips VARCHAR(2),
          countyName TEXT,
          countyFips VARCHAR(5),
          timezone TEXT,
          dst BOOLEAN,
          shape MULTIPOLYGON NOT NULL
        )`,
    );

    await db.end();

    return true;
  },
};

const loadData = async () => {
  console.log("  loading counties data");

  const db = await openDatabase();
  const file = await shapefile.open(`./c_05mr24.shp`);

  await dropIndexIfExists(db, "counties_spatial_idx", metadata.table);

  const shapeTzToIANA = new Map([
    ["V", "America/Puerto_Rico"],
    ["E", "America/New_York"],
    ["C", "America/Chicago"],
    ["M", "America/Denver"],
    ["P", "America/Los_Angeles"],
    ["A", "America/Anchorage"],
    ["H", "Pacific/Hololulu"],
    ["G", "Pacific/Guam"],
    ["J", "Asia/Tokyo"],
    ["S", "Pacific/Pago_Pago"],
  ]);

  await db.query(`TRUNCATE TABLE ${metadata.table}`);
  await db.query(`ALTER TABLE ${metadata.table} AUTO_INCREMENT=0`);

  const getSqlForShape = async ({ done, value }) => {
    if (done) {
      return null;
    }

    const {
      properties: { STATE: state, COUNTYNAME: name, FIPS: fips, TIME_ZONE: tz },
      geometry,
    } = value;

    if (geometry.type === "Polygon") {
      geometry.type = "MultiPolygon";
      geometry.coordinates = [geometry.coordinates];
    }
    // These shapefiles are in NAD83, whose SRID is 4269.
    geometry.crs = { type: "name", properties: { name: "EPSG:4269" } };

    const timezone = shapeTzToIANA.get(tz.toUpperCase());
    const observesDST = tz.toUpperCase() === tz;

    await db.query(
      `INSERT INTO ${metadata.table}
        (state, countyName, countyFips, timezone, dst, shape)
        VALUES(
          '${state}',
          '${name.replace(/'/g, "''") /* escape single quotes */}',
          '${fips}',
          '${timezone}',
          ${observesDST},
          ST_GeomFromGeoJSON('${JSON.stringify(geometry)}')
        )`,
    );

    return file.read().then(getSqlForShape);
  };

  await file.read().then(getSqlForShape);

  // Once we've got all the counties loaded, grab the associated full state
  // names and state FIPS codes from the states table.
  await db.query(
    `UPDATE ${metadata.table} c
          SET
          stateName=(
            SELECT name FROM ${statesTable} s
            WHERE
              s.state=c.state
          ),
          stateFips=(
            SELECT fips FROM ${statesTable} s
            WHERE
              s.state=c.state
          )`,
  );

  await db.query(
    `CREATE SPATIAL INDEX counties_spatial_idx ON ${metadata.table}(shape)`,
  );

  db.end();
};

module.exports = { ...metadata, schemas, loadData };
