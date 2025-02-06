const chalk = require("chalk");
const metadata = require("./meta.js");
const { openDatabase } = require("./db");

module.exports = async ({ target, from, metadata: { table, schemas } }) => {
  const schemaVersions = Object.keys(schemas).filter(
    (version) => +version > from,
  );
  const upgrades = [...Array(schemaVersions.length)].map(
    // Plus one because our schema versions are 1-based, not 0-based.
    (_, i) => i + from + 1,
  );

  console.log(`━━━━━━ Updating ${target} [${table}] ━━━━━`);

  for await (const version of upgrades) {
    const { schema, data } = schemas[version];

    const db = await openDatabase();
    try {
      await db.beginTransaction();
      console.log(chalk.blue(`  to version ${version}`));
      if (schema) {
        console.log(chalk.yellow("    ● updating schema"));
        await schema(db);
      }
      if (data) {
        console.log(chalk.yellow("    ● updating data"));
        await data(db);
      }

      console.log(chalk.yellow("    ● updating metadata"));
      await metadata.update(db, table, version);
      await db.commit();
      console.log(
        chalk.green(`    ● successfully updated to version ${version}`),
      );
    } catch (e) {
      console.log("  ERROR");
      console.log(e);
      await db.rollback();
      break;
    } finally {
      await db.end();
    }
  }
};
