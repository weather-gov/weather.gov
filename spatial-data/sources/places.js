const fs = require("node:fs/promises");

const { dropIndexIfExists } = require("../lib/db.js");
const { US_CODES } = require("../lib/util.js");

const metadata = {
  table: "weathergov_geo_places",
};

const schemas = {
  1: {
    schema: async (db) => {
      await db.query(`DROP TABLE IF EXISTS ${metadata.table}`);

      await db.query(
        `CREATE TABLE
        ${metadata.table}
          (
            id serial NOT NULL PRIMARY KEY,
            name TEXT,
            state TEXT,
            stateName TEXT,
            stateFIPS VARCHAR(2),
            county TEXT,
            countyFIPS VARCHAR(5),
            timezone TEXT,
            point geometry(POINT) NOT NULL
          )`,
      );
    },
    data: async (db) => {
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
        "state", // 10
        "county",
        "undefined",
        "undefined",
        "undefined",
        "undefined",
        "undefined",
        "timezone", // 17
      ];

      const places = await fs
        .readFile(`./data/us.cities500.txt`, { encoding: "utf-8" })
        .then((str) =>
          str
            .split("\n")
            .map((v) => v.trim().split("\t"))
            // Remove non-US, non-populated-places before we do anything else
            .filter(
              (place) =>
                US_CODES.includes(place[8]) && place[7].startsWith("PPL"),
            )
            .map((place) => {
              const placeObj = {};
              place.forEach((prop, i) => {
                placeObj[parameters[i]] = prop.trim();
              });

              if (placeObj.country !== "US") {
                // We should only rely on county FIPS codes from Geonames for states
                // and territories identifed as US by the country code. Otherwise,
                // it's a crapshoot. So we'll fake out a county FIPS code to trigger
                // a spatial query.
                placeObj.county = "use spatial query";
              }
              return placeObj;
            })
            .map((o) => {
              delete o.undefined;
              return o;
            }),
        );

      await Promise.all(
        places
          // Get all of the places with invalid county FIPS codes
          .filter((place) => place.county.length > 5)
          .map(async (place) => {
            // American Samoa has 15 actual counties contained within 5 FIPS
            // counties. These three cities in particular for some reason fail the
            // spatial query below, but we know their actual counties, so we can
            // translate those into th FIPS counties that contain them.
            //
            // https://en.wikipedia.org/wiki/Administrative_divisions_of_American_Samoa
            //
            // Eg, Alao is in Vaifanua County, which is in the Eastern FIPS county,
            // whose code is 60010. Since these 3 cities don't match our queries,
            // we'll handle them specially.
            if (place.country === "AS") {
              if (place.name === "Alao") {
                place.county = "60010";
                return;
              }
              if (place.name === "Taulaga") {
                place.county = "60040";
                return;
              }
              if (place.name === "Leloaloa") {
                place.county = "60010";
                return;
              }
            }

            // For all other cases, find the FIPS county that contains the place's
            // point and use those state and FIPS code values.
            const sql = `
              SELECT state,countyFips as county
              FROM weathergov_geo_counties
                WHERE ST_CONTAINS(
                  shape,
                  ST_GEOMFROMTEXT('POINT(${place.lon} ${place.lat})', 4326)
                )
              LIMIT 1`;

            const result = await db.query(sql);
            if (result.rows && result.rows.length) {
              const [{ state, county }] = result.rows;

              place.county = county;
              place.state = state;
            }
          }),
      );

      await dropIndexIfExists(
        db,
        "places_spatial_idx",
        "weathergov_geo_places",
      );
      await db.query("TRUNCATE TABLE weathergov_geo_places");
      //await db.query("ALTER TABLE weathergov_geo_places AUTO_INCREMENT=0");

      await Promise.all(
        places.map((place) => {
          // If the place is in one of the US
          // territories, we use the country code
          // for that territory as the state
          let { state } = place;
          if (place.country !== "US") {
            state = place.country;
          }
          return db.query(
            // This query is probably over-complicated. It should likely be
            // refactored into an insertion and a couple of updates. But... I don't
            // want to break something that works right now.
            //
            // Note that here, our point WKT is lon/lat. This works because we do
            // not specify a coordinate system and it is therefore not geographic.
            // We may want to change this in the future, but for now our Drupal code
            // also does not expect a geographic coordinate system.
            `INSERT INTO weathergov_geo_places
              (name,state,stateName,stateFIPS,county,countyFIPS,timezone,point)
              SELECT
                '${place.name.replace(/'/g, "''")}' as place,
                '${state}' as state,
                stateName,
                stateFips,
                countyName,
                countyFips,
                '${place.timezone}',
                ST_PointFromText('POINT(${place.lon} ${place.lat})')
              FROM
                weathergov_geo_counties
              WHERE
                stateName=(
                  SELECT name FROM weathergov_geo_states WHERE state='${place.state}'
                )
                AND
                countyFips LIKE '%${place.county}'`,
          );
        }),
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
            `DELETE FROM weathergov_geo_places WHERE state='${state}' AND name='${name}'`
          ),
        ),
      );

      await db.query(
        "CREATE INDEX places_spatial_idx ON weathergov_geo_places USING GIST(point)",
      );
    },
  },
};

module.exports = { ...metadata, schemas };
