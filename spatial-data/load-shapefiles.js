const fs = require("node:fs/promises");
const mariadb = require("mariadb");
const shapefile = require("shapefile");

// Slice off Node executable and script, keep just the args.
const args = process.argv.slice(2);

const files = {
  state: args[0] ?? "s_05mr24",
  county: args[1] ?? "c_05mr24",
  city: args[2] ?? "cities500.txt",
  cwa: args[3] ?? "w_05mr24",
};

const connectionDetails = {
  user: args[3] ?? "drupal",
  password: args[4] ?? "drupal",
  database: args[5] ?? "weathergov",
  host: args[6] ?? "database",
  port: args[7] ?? 3306,
};

// MariaDB supports IF EXISTS with indices but MySQL does not, so use this more
// convoluted way to drop indices if they already exists. (If you try to drop an
// index that doesn't exist, that's an error.)
const dropIndexIfExists = async (db, name, table) => {
  await db.query(
    `set @exist := (select count(*) from information_schema.statistics where table_name ='${table}' and index_name = '${name}' and table_schema = database())`,
  );
  await db.query(
    `set @sqlstmt := if( @exist > 0, 'DROP INDEX ${name} ON ${table}', 'select "INFO: Index does not exist."')`,
  );
  await db.query(`PREPARE stmt FROM @sqlstmt`);
  await db.query(`EXECUTE stmt`);
};

const loadCWAs = async () => {
  console.log("loading WFOs...");
  const db = await mariadb.createConnection(connectionDetails);

  const file = await shapefile.open(`./${files.cwa}.shp`);

  await db.query(`
CREATE TABLE IF NOT EXISTS
 weathergov_geo_cwas
 (
   wfo VARCHAR(3),
   cwa VARCHAR(3),
   region VARCHAR(2),
   city VARCHAR(50),
   state VARCHAR(50),
   st VARCHAR(2),
   shape MULTIPOLYGON NOT NULL
)`,
                );

  await dropIndexIfExists(db, "cwas_spatial_idx", "weathergov_geo_cwas");
  await db.query("TRUNCATE TABLE weathergov_geo_cwas");

  const getSqlForShape = async ({done, value}) => {
    if(done){
      return null;
    }

    const {
      properties: {
        WFO: wfo,
        CWA: cwa,
        REGION: region,
        CITY: city,
        STATE: state,
        ST: st
      }, geometry
    } = value;

    if(geometry.type === "Polygon"){
      geometry.type = "Multipolygon";
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

const loadStates = async () => {
  console.log("loading states...");
  const db = await mariadb.createConnection(connectionDetails);

  const file = await shapefile.open(`./${files.state}.shp`);

  await db.query(
    `CREATE TABLE IF NOT EXISTS
      weathergov_geo_states
      (
        state VARCHAR(2),
        name TEXT,
        fips VARCHAR(2),
        shape MULTIPOLYGON NOT NULL
      )`,
  );

  await dropIndexIfExists(db, "states_spatial_idx", "weathergov_geo_states");

  await db.query("TRUNCATE TABLE weathergov_geo_states");

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

  db.end();
};

const loadCounties = async () => {
  console.log("loading counties...");
  const db = await mariadb.createConnection(connectionDetails);

  const file = await shapefile.open(`./${files.county}.shp`);

  await db.query(
    `CREATE TABLE IF NOT EXISTS
      weathergov_geo_counties
      (
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
  await dropIndexIfExists(
    db,
    "counties_spatial_idx",
    "weathergov_geo_counties",
  );

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

  await db.query("TRUNCATE TABLE weathergov_geo_counties");

  const getSqlForShape = async ({ done, value }) => {
    if (done) {
      // Once we've got all the counties loaded, grab the associated full state
      // names and state FIPS codes from the states table.
      await db.query(
        `UPDATE weathergov_geo_counties c
          SET
          stateName=(
            SELECT name FROM weathergov_geo_states s
            WHERE
              s.state=c.state
          ),
          stateFips=(
            SELECT fips FROM weathergov_geo_states s
            WHERE
              s.state=c.state
          )`,
      );
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
      `INSERT INTO weathergov_geo_counties
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

  await db.query(
    "CREATE SPATIAL INDEX counties_spatial_idx ON weathergov_geo_counties(shape)",
  );

  db.end();
};

const loadPlaces = async () => {
  console.log("loading places...");

  const parameters = [
    "undefined",
    "name",
    "undefined",
    "undefined",
    "lat",
    "lon",
    "class",
    "code",
    "country",
    "undefined",
    "state",
    "county",
  ];

  const places = await fs
    .readFile(`./${files.city}`, { encoding: "utf-8" })
    .then((str) =>
      str
        .split("\n")
        .map((v) => v.trim().split("\t"))
        // Remove non-US, non-populated-places before we do anything else
        .filter((place) => place[8] === "US" && place[7].startsWith("PPL"))
        .map((place) => {
          const placeObj = {};
          place.forEach((prop, i) => {
            placeObj[parameters[i]] = prop.trim();
          });
          return placeObj;
        })
        .map((o) => {
          delete o.undefined;
          return o;
        }),
    );

  const db = await mariadb.createConnection(connectionDetails);

  await db.query(
    `CREATE TABLE IF NOT EXISTS
      weathergov_geo_places
        (
          name TEXT,
          state TEXT,
          stateName TEXT,
          stateFIPS VARCHAR(2),
          county TEXT,
          countyFIPS VARCHAR(5),
          timezone TEXT,
          point POINT NOT NULL
        )`,
  );
  await dropIndexIfExists(db, "places_spatial_idx", "weathergov_geo_places");

  await db.query("TRUNCATE TABLE weathergov_geo_places");

  await Promise.all(
    places.map((place) =>
      db.query(
        // This query is probably over-complicated. It should likely be
        // refactored into an insertion and a couple of updates. But... I don't
        // want to break something that works right now.
        `INSERT INTO weathergov_geo_places
          (name,state,stateName,stateFIPS,county,countyFIPS,timezone,point)
          SELECT
            '${place.name.replace(/'/g, "''")}' as place,
            '${place.state}' as state,
            stateName,
            stateFips,
            countyName,
            countyFips,
            timezone,
            ST_GeomFromText('POINT(${place.lon} ${place.lat})') as geom
          FROM
            weathergov_geo_counties
          WHERE
            stateName=(
              SELECT name FROM weathergov_geo_states WHERE state='${place.state}'
            )
            AND
            countyFips LIKE '%${place.county}'`,
      ),
    ),
  );

  // We know of a few places that shouldn't be included, so let's drop those.
  const remove = [
    ["Firing Range", "GA"],
    ["Sugarcreek Police Dept", "OH"],
    ["Washington Street Courthouse Annex", "AL"],
    ["Carls Jr", "CA"],
  ];
  await Promise.all(
    remove.map(([name, state]) =>
      db.query(
        `DELETE FROM weathergov_geo_places WHERE state="${state}" AND name="${name}"`,
      ),
    ),
  );

  await db.query(
    "CREATE SPATIAL INDEX places_spatial_idx ON weathergov_geo_places(point)",
  );

  db.end();
};

loadStates()
  .then(() => loadCounties())
  .then(() => loadPlaces())
  .then(() => loadCWAs());
