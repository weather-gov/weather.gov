const mariadb = require("mariadb");

module.exports.openDatabase = async () => {
  // Slice off Node executable and script, keep just the args.
  const args = process.argv.slice(2);

  const connectionDetails = {
    user: args[0] ?? "drupal",
    password: args[1] ?? "drupal",
    database: args[2] ?? "weathergov",
    host: args[3] ?? "database",
    port: args[4] ?? 3306,
  };

  return mariadb.createConnection(connectionDetails);
};

// MariaDB supports IF EXISTS with indices but MySQL does not, so use this more
// convoluted way to drop indices if they already exists. (If you try to drop an
// index that doesn't exist, that's an error.)
module.exports.dropIndexIfExists = async (db, name, table) => {
  await db.query(
    `set @exist := (select count(*) from information_schema.statistics where table_name ='${table}' and index_name = '${name}' and table_schema = database())`,
  );
  await db.query(
    `set @sqlstmt := if( @exist > 0, 'DROP INDEX ${name} ON ${table}', 'select "INFO: Index does not exist."')`,
  );
  await db.query(`PREPARE stmt FROM @sqlstmt`);
  await db.query(`EXECUTE stmt`);
};
