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

module.exports = async () => {
  const db = await openDatabase();

  await db.query(
    `CREATE TABLE IF NOT EXISTS
      weathergov_geo_metadata
      (
        table_name varchar(512) NOT NULL PRIMARY KEY,
        version SMALLINT UNSIGNED
      )`,
  );

  const existing = await db
    .query("SELECT * FROM weathergov_geo_metadata")
    .then((list) =>
      list.reduce(
        (o, meta) => ({
          ...o,
          [meta.table_name]: meta.version,
        }),
        {},
      ),
    );

  await db.end();

  const results = {};
  for (const [target, metadata] of Object.entries(targets)) {
    const databaseVersion = +(existing[metadata.table] ?? 0);

    const currentVersion = Math.max(
      ...Object.keys(metadata?.schemas).map((v) => +v),
    );

    results[target] = {
      update: currentVersion > databaseVersion,
      from: databaseVersion,
      to: currentVersion,
      metadata,
    };
  }

  return results;
};

module.exports.update = async () => {
  const meta = await module.exports();

  const db = await openDatabase();

  for await (const [source, metadata] of Object.entries(targets)) {
    if (meta[source].update) {
      const currentVersion = Math.max(
        ...Object.keys(metadata?.schemas).map((v) => +v),
      );
      console.log(`setting ${metadata.table} to version ${currentVersion}`);

      // UPSERT query, essentially
      const sql = `INSERT INTO weathergov_geo_metadata
                  (table_name, version)
                VALUES("${metadata.table}", "${currentVersion}")
                ON DUPLICATE KEY
                  UPDATE version="${currentVersion}"`;
      await db.query(sql);
    }
  }

  await db.end();
};
