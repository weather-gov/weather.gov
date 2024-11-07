const { exec: nodeExec } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const chalk = require("chalk");
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

  console.log(`  ${chalk.blue(`getting data for ${filePath}`)}`);
  if (!(await fileExists(filePath))) {
    console.log(`    ${chalk.yellow(`● downloading ${filePath}...`)}`);
    const data = await fetch(url)
      .then((r) => r.blob())
      .then((blob) => blob.arrayBuffer());
    await fs.writeFile(filePath, Buffer.from(data));
    console.log(`    ${chalk.green("●")} downloaded`);
  } else {
    console.log(`    ${chalk.green("●")} ${filePath} is already present`);
  }

  await exec(`unzip -t ${filePath}`)
    .then(async () => {
      await module.exports.unzip(filePath);
    })
    .catch(async () => {
      console.log(chalk.red("    ● zip file is corrupt. Trying again..."));
      await fs.unlink(filePath);
      await module.exports.downloadAndUnzip(url);
    });
};

module.exports.unzip = async (filePath, outDirectory = "./data") => {
  console.log(`    ${chalk.yellow(`● decompressing ${filePath}`)}`);

  // Use -o to overwrite existing files.
  await exec(`unzip -o -u ${filePath} -d ${outDirectory}`);
  console.log(`    ${chalk.green("●")} ${filePath} decompressed`);
};
