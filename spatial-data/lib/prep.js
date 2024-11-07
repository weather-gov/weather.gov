const { exec: nodeExec } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const { fileExists } = require("./util.js");

const DATA_PATH = "./data";

const exec = async (...args) =>
  new Promise((resolve, reject) => {
    nodeExec(...args, (err, stdout) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });

module.exports.downloadAndUnzip = async (url) => {
  const filePath = path.join(DATA_PATH, url.split("/").pop());

  if (!(await fileExists(filePath))) {
    console.log(`Downloading ${filePath}...`);
    const data = await fetch(url)
      .then((r) => r.blob())
      .then((blob) => blob.arrayBuffer());
    await fs.writeFile(filePath, Buffer.from(data));
  } else {
    console.log(`${filePath} is already present`);
  }

  await exec(`unzip -t ${filePath}`)
    .then(async () => {
      await module.exports.unzip(filePath);

      console.log(`   [${filePath}] done`);
    })
    .catch(async () => {
      console.log("zip file is corrupt. Trying again...");
      await fs.unlink(filePath);
      await module.exports.downloadAndUnzip(url);
    });
};

module.exports.unzip = async (filePath, outDirectory = "./data") => {
  console.log(`   [${filePath}] decompressing...`);

  // Use -o to overwrite existing files.
  await exec(`unzip -o -u ${filePath} -d ${outDirectory}`);
};
