const { exec } = require("node:child_process");
const fs = require("node:fs/promises");
const { fileExists } = require("./util.js");

module.exports.downloadAndUnzip = async (url) => {
  const filename = url.split("/").pop();

  if (!(await fileExists(filename))) {
    console.log(`Downloading ${filename}...`);
    const data = await fetch(url)
      .then((r) => r.blob())
      .then((blob) => blob.arrayBuffer());
    await fs.writeFile(filename, Buffer.from(data));
  } else {
    console.log(`${filename} is already present`);
  }

  await module.exports.unzip(filename);

  console.log(`   [${filename}] done`);
};

module.exports.unzip = (path) =>
  new Promise((resolve) => {
    console.log(`   [${path}] decompressing...`);
    exec(`unzip -u ${path}`, () => {
      resolve();
    });
  });
