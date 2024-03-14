/* eslint-disable */

import { parse } from "csv-parse/sync";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import * as fs from "fs";
import { resolve } from "path";

const inputPath = process.argv[2];
const bundleRoot = process.argv[3];
const wfoCode = process.argv[4];
const pointCoords = process.argv[5];

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
if(!pointCoords){
  argErrors.push("You must provide a set of lat,lon coordinates in the format lat,lon as the fourth argument");
}
if(argErrors.length){
  argErrors.forEach((errStr) => console.error(errStr));
  process.exit(-1);
}

const CARDINAL_DEGREES = {
  "N": 0,
  "NE": 45,
  "E": 90,
  "SE": 135,
  "S": 180,
  "SW": 225,
  "W": 270,
  "NW": 315
};

const cardinalToDegrees = (cardinalStr) => {
  // If an incoming cardinal string has 3 chars,
  // we know it is a compound type. Return a value
  // halfway between them
  if(cardinalStr.length === 3){
    const main = CARDINAL_DEGREES[cardinalStr[0]];
    const inter = CARDINAL_DEGREES[cardinalStr.slice(1)];
    const diff = Math.abs(main - inter);
    return Math.floor(
      Math.min(main, inter) + (diff / 2)
    );
  }

  return CARDINAL_DEGREES[cardinalStr];
};

// Set up dayjs plugins and configure
// the default timezone from cli arg
dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(timezone);

const validateBundle = (bundleRoot) => {
  if(!fs.existsSync(bundleRoot)){
    console.error(`Invalid bundle root: ${bundleRoot}`);
    process.exit(-1);
  }

  const pointFilePath = resolve(
    bundleRoot,
    "points",
    `${pointCoords}.json`
  );
  if(!fs.existsSync(pointFilePath)){
    console.error(`Invalid geo points file for bundle: ${pointFilePath}`);
    process.exit(-1);
  }
  const pointData = JSON.parse(
    fs.readFileSync(pointFilePath)
  );
  const gridTimezone = pointData.properties.timeZone;

  // Get the grid path and file based on the given
  // point data
  const gridPointRootPath = resolve(
    bundleRoot,
    "gridpoints",
    pointData.properties.gridId,
    `${pointData.properties.gridX},${pointData.properties.gridY}`
  );
  const stationsFilePath = resolve(
    gridPointRootPath,
    "stations.json"
  );
  if(!fs.existsSync(stationsFilePath)){
    console.error(`Invalid stations file for bundle: ${stationsFilePath}`);
    process.exit(-1);
  }
  const stationsData = JSON.parse(
    fs.readFileSync(stationsFilePath)
  );

  // Get the first observation station file path
  // and data
  const obsStationFilePath = resolve(
    bundleRoot,
    "stations",
    stationsData.features[0].properties.stationIdentifier,
    "observations__limit=1.json"
  );
  if(!fs.existsSync(obsStationFilePath)){
    console.error(`Invalid observation station file for bundle: ${obsStationFilePath}`);
    process.exit(-1);
  }
  const obsData = JSON.parse(
    fs.readFileSync(obsStationFilePath)
  );

  return {
    gridTimezone,
    pointData,
    stationsData,
    obsData
  };
};

const {
  gridTimezone,
  obsData
} = validateBundle(bundleRoot);

/**
 * For a given row of CSV data,
 * parse a timestamp from the date
 * and time columns
 */
const parseTimestamp = (row, timeFieldName="time", dateFieldName="date") => {
  let date = dayjs(
    row[dateFieldName],
    "YYYY-MM-DD"
  );
  const time = dayjs(
    row[timeFieldName],
    "H:mm A"
  );

  date = date.hour(time.hour());
  date = date.tz(gridTimezone, true);
  return date.format();
};

/**
 * For a given row of CSV data,
 * parse the temperature into the structure
 * as it should appear in the observation data
 */
const parseTemperature = (row, fieldName="temperature", unitCode="wmoUnit:degF", qualityControl="V") => {
  const temp = parseFloat(row[fieldName]);
  return {
    value: temp,
    unitCode,
    qualityControl
  };
};

/**
 * For a given row of CSV data,
 * parse the humidity into the structure
 * as it should appear in the observation data
 */
const parseHumidity = (row, fieldName="humidity") => {
  const hum = parseInt(
    row[fieldName].replace("%", "").trim()
  );
  return {
    unitCode: "wmoUnit:percent",
    value: hum,
    qualityControl: "V"
  };
};

/**
 * For a given row of CSV data,
 * parse the "feels like" temperature
 * (here being the wind chill) into
 * the structure as it should appear in the
 * observation data
 */
const parseFeelsLike = (row, fieldName="feels like", unitCode="wmoUnit:degF", qualityControl="V") => {
  const temp = parseInt(row[fieldName]);
  return {
    value: temp,
    unitCode,
    qualityControl
  };
};

/**
 * Given a row of CSV data,
 * parse both the wind speed into
 * a structure as it should appear in
 * the observation data
 */
const parseWindSpeed = (row, fieldName="wind speed", unitCode="wmoUnit:m_h", qualityControl="V") => {
  const speed = parseFloat(row[fieldName]);
  return {
    value: speed,
    unitCode,
    qualityControl
  };
};

/**
 * Given a row of CSV data,
 * parse both the wind direction into
 * a structure as it should appear in
 * the observation data
 */
const parseWindDirection = (row, fieldName="wind direction", unitCode="wmoUnit:degree_(angle)", qualityControl="V") => {
  return {
    value: cardinalToDegrees(row[fieldName]),
    unitCode,
    qualityControl
  };
};

const fileData = fs.readFileSync(inputPath);
const rowData = parse(fileData, {columns: true});

const parsedRowData = rowData.map(row => {
  return {
    timestamp: parseTimestamp(row),
    temperature: parseTemperature(row),
    relativeHumidity: parseHumidity(row),
    windChill: parseFeelsLike(row),
    heatIndex: parseFeelsLike(row),
    icon: row["icon"],
    textDescription: row["condition"],
    windSpeed: parseWindSpeed(row),
    windDirection: parseWindDirection(row)
  };
});

const mergedObservations = parsedRowData.map(parsedRow => {
  return Object.assign(
    {},
    obsData.features[0],
    {
      properties: Object.assign(
        {},
        obsData.features[0],
        parsedRow
      )
    }
  );
});

const modifiedObsData = Object.assign(
  {},
  obsData,
  { features: mergedObservations }
);

fs.writeFileSync(
  "./observations.json",
  JSON.stringify(modifiedObsData, null, 2)
);
console.log("Wrote observations.json");
console.log(parsedRowData);
