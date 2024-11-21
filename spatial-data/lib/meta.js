const { openDatabase } = require("./db.js");

const counties = require("../sources/counties.js");
const cwas = require("../sources/countyWarningAreas.js");
const places = require("../sources/places.js");
const states = require("../sources/states.js");
const zones = require("../sources/zones.js");

// These should be in dependency order. That is, if any table depends on another
// table, the dependent table should be listed *after* its dependency.
const targets = {
  states,
  counties,
  cwas,
  places,
  zones,
};

const initializeMetadataTable = async (db) => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS
      weathergov_geo_metadata
      (
        table_name varchar(512) NOT NULL PRIMARY KEY,
        version SMALLINT UNSIGNED DEFAULT 0
      )`,
  );
};

module.exports = async () => {
  const db = await openDatabase();

  await initializeMetadataTable(db);

  // Get the existing schema and data versions for our tables and mape it into
  // a useful data structure.
  const existing = await db
    .query("SELECT * FROM weathergov_geo_metadata")
    .then(([rows]) =>
      rows.reduce(
        (o, meta) => ({
          ...o,
          [meta.table_name]: meta.version,
        }),
        {},
      ),
    );

  await db.end();

  const pendingUpdates = [];

  // Iterate through all of our sources and figure out which ones need to be
  // updated in which ways.
  for (const [target, metadata] of Object.entries(targets)) {
    const currentSchemaVersion = +(existing[metadata.table] ?? 0);

    const wantedSchemaVersion = Math.max(
      ...Object.keys(metadata?.schemas).map((v) => +v),
    );

    pendingUpdates.push({
      target,
      update: wantedSchemaVersion > currentSchemaVersion,
      from: currentSchemaVersion,
      to: wantedSchemaVersion,
      metadata,
    });
  }

  return pendingUpdates;
};

module.exports.update = async (db, table, version) => {
  // UPSERT query, essentially
  const sql = `INSERT INTO weathergov_geo_metadata
                  (table_name, version)
                VALUES(?,?)
                ON DUPLICATE KEY
                  UPDATE version=?`;
  await db.query(sql, [table, version, version]);
};
