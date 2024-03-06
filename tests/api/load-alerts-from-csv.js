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

  const pointFile = fs.readFileSync(pointFilePath);
  const pointData = JSON.parse(pointFile);
  const state = pointData.properties.relativeLocation.properties.state;
  const forecastZone = pointData.properties.forecastZone;
  const gridTimezone = pointData.properties.timeZone;

  const alertFilePath = resolve(
    bundleRoot,
    "alerts",
    `active__status=actual&area=${state}.json`
  );
  if(!fs.existsSync(alertFilePath)){
    console.error(`Invalid alert file for bundle: ${alertFilePath}`);
    process.exit(-1);
  }

  const alertFile = fs.readFileSync(alertFilePath);
  const alertData = JSON.parse(alertFile);

  return {
    pointData,
    alertData,
    state,
    forecastZone,
    gridTimezone
  };
};

const {
  pointData,
  alertData,
  state,
  forecastZone,
  gridTimezone
} = validateBundle(bundleRoot);

const parseOnsetOrEnds = (row, dateFieldName="onset date", timeFieldName="onset time") => {
  let date = dayjs(
    row[dateFieldName],
    "YYYY-MM-DD"
  );
  let time = dayjs(
    row[timeFieldName],
    "h:mm A"
  );

  date = date.hour(time.hour());
  date = date.minute(time.minute());
  date = date.tz(gridTimezone, true);

  return date.format();
};

const fileData = fs.readFileSync(inputPath);
const rowData = parse(fileData, {columns: true});

const parsedRowData = rowData.map(row => {
  const onsetTimestamp = parseOnsetOrEnds(row);
  const endsTimestamp = parseOnsetOrEnds(row, "ends date", "ends time");
  const genericPreTimestamp = dayjs(onsetTimestamp)
        .subtract(1, "d")
        .tz(gridTimezone, true)
        .format();
  const genericPostTimestamp = dayjs(endsTimestamp)
        .add(1, "d")
        .tz(gridTimezone, true)
        .format();
  return {
    onset: onsetTimestamp,
    ends: endsTimestamp,
    areaDesc: row["areaDesc"],
    description: row["description"],
    sent: genericPreTimestamp,
    effective: genericPreTimestamp,
    expires: genericPostTimestamp,
    status: "Actual",
    event: row["event"],
    affectedZones: [forecastZone],
    geocode: {
      SAME: [],
      UGC: [`${forecastZone.split("/").pop()}`]
    },
    senderName: row.senderName
  };
});

/**
 * For a given element of parsed alert row data
 * and a copy of the existing alerts JSON data,
 * format the row into a full  alert record by
 * merging the first alert feature with the row data.
 *
 * Returns a new object.
 */
const formatSingleAlert = (parsedRow, alertData) => {
  const firstAlert = alertData.features[0];
  return Object.assign(
    {},
    firstAlert,
    {
      properties: parsedRow
    }
  );
};

// Update the alert features and write to
// output file
const modifiedAlertData = Object.assign(
  {},
  alertData,
  {
    features: parsedRowData.map(parsedRow => formatSingleAlert(parsedRow, alertData))
  }
);

fs.writeFileSync(
  "./alerts.json",
  JSON.stringify(modifiedAlertData, null, 2)
);
console.log(`Wrote alerts.json`);
