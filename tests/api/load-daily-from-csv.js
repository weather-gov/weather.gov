import { parse } from "csv-parse/sync";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import * as fs from "fs";
import { resolve } from "path";

const inputPath = process.argv[2];
const bundleRoot = process.argv[3];
const wfoCode = process.argv[4];
const gridCoords = process.argv[5];

const argErrors = [];
if(!inputPath){
  argErrors.push("You must provide an input file path as the first argument");
}
if(!bundleRoot){
  argErrors.push("You must provide a path to the bundle root");
}
if(!wfoCode){
  argErrors.push("You must provide a valid WFO code as the third argument");
}
if(!gridCoords){
  argErrors.push("You must provide a set of grid coordinates in the format X,Y as the fourth argument");
}
if(argErrors.length){
  argErrors.forEach((errStr) => console.error(errStr));
  process.exit(-1);
}

const validateBundle = (bundleRoot) => {
  if(!fs.existsSync(bundleRoot)){
    console.error(`Invalid bundle root: ${bundleRoot}`);
    process.exit(-1);
  }
  const gridpointsFilePath = resolve(
    bundleRoot,
    "gridpoints",
    wfoCode,
    `${gridCoords}.json`
  );
  if(!fs.existsSync(gridpointsFilePath)){
    console.error(`Invalid gridpoints file for bundle: ${gridpointsFilePath}`);
    process.exit(-1);
  }
  const hourlyFilePath = resolve(
    bundleRoot,
    "gridpoints",
    wfoCode,
    gridCoords,
    "forecast",
    "hourly.json"
  );
  if(!fs.existsSync(hourlyFilePath)){
    console.error(`Invalid hourly forecast file for bundle: ${hourlyFilePath}`);
  }

  return [
    gridpointsFilePath,
    hourlyFilePath
  ];
};

/**
 * Given a parsed ro object of CSV data,
 * compose a timestamp corresponding to the
 * period portion of the day.
 */
