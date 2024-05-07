const { exec: nodeExec } = require("node:child_process");
const fs = require("node:fs/promises");
const { fileExists } = require("./util.js");

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

  await exec(`unzip -t ${filename}`)
    .then(async () => {
      await module.exports.unzip(filename);

      console.log(`   [${filename}] done`);
    })
    .catch(async () => {
      console.log("zip file is corrupt. Trying again...");
      await fs.unlink(filename);
      await module.exports.downloadAndUnzip(url);
    });
};

module.exports.unzip = async (path) => {
  console.log(`   [${path}] decompressing...`);
  await exec(`unzip -u ${path}`);
};
