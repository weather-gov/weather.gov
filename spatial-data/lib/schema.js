module.exports = async ({ from, metadata: { table, schemas } }) => {
  const schemaVersions = Object.keys(schemas).filter(
    (version) => +version > from,
  );
  const upgrades = [...Array(schemaVersions.length)].map(
    // Plus one because our schema versions are 1-based, not 0-based.
    (_, i) => i + from + 1,
  );

  let needsDataUpdate = false;
  for await (const version of upgrades) {
    console.log(`  upgrading ${table} schema to version ${version}`);
    const versionNeedsDataUpdate = await schemas[version]();

    needsDataUpdate = needsDataUpdate || versionNeedsDataUpdate;
  }

  return needsDataUpdate;
};
