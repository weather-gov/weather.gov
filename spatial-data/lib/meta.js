const { openDatabase } = require("./db.js");

const { metadata: counties } = require("../sources/counties.js");
const { metadata: cwas } = require("../sources/countyWarningAreas.js");
const { metadata: places } = require("../sources/places.js");
const { metadata: states } = require("../sources/states.js");

const targets = {
  counties,
  cwas,
  places,
  states,
};

module.exports = async () => {
  console.log("fetching versioning metadata...");
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
    const currentVersion = metadata?.version ?? 0;

    results[target] = {
      update: currentVersion > databaseVersion,
    };
  }

  return results;
};

module.exports.update = async () => {
  const meta = await module.exports();

  const db = await openDatabase();

  for await (const [source, metadata] of Object.entries(targets)) {
    if (meta[source].update) {
      console.log(`setting ${metadata.table} to version ${metadata.version}`);

      // UPSERT query, essentially
      const sql = `INSERT INTO weathergov_geo_metadata
                  (table_name, version)
                VALUES("${metadata.table}", "${metadata.version}")
                ON DUPLICATE KEY
                  UPDATE version="${metadata.version}"`;
      await db.query(sql);
    }
  }

  await db.end();
};
