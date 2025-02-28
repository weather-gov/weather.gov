const pg = require("pg");
const { Client } = pg;

module.exports.openDatabase = async () => {
  // Slice off Node executable and script, keep just the args.
  const args = process.argv.slice(2);

  const connectionDetails = {
    user: args[0] ?? "drupal",
    password: args[1] ?? "drupal",
    database: args[2] ?? "weathergov",
    host: args[3] ?? process.env.DB_HOST ?? "database",
    port: args[4] ?? 5432,
  };

  const client = new Client(connectionDetails);
  await client.connect();
  return client;
};

module.exports.beginTransaction = async client => {
  return await client.query("BEGIN;");
};

module.exports.commitTransaction = async client => {
  return await client.query("END;");
};

module.exports.rollbackTransaction = async client => {
  return await client.query("ROLLBACK;");
};


module.exports.dropIndexIfExists = async (db, name, table) => {
  await db.query(
    `DROP INDEX IF EXISTS ${name}`
  );
};
