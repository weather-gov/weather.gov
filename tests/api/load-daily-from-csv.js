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
const gridCoords = process.argv[5];
const gridTimezone = process.argv[6];

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
if(!gridTimezone){
  argErrors.push("You must provide a timezone string as the fifth argument, in a format like America/Denver");
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
    process.exit(-1);
  }
  const dailyFilePath = resolve(
    bundleRoot,
    "gridpoints",
    wfoCode,
    gridCoords,
    "forecast.json"
  );
  if(!fs.existsSync(dailyFilePath)){
    console.error(`Invalid daily forecast file for bundle: ${dailyFilePath}`);
    process.exit(-1);
  }

  return [
    gridpointsFilePath,
    hourlyFilePath,
    dailyFilePath
  ];
};

// Set up dayjs plugins and configure
// the default timezone from cli arg
dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(timezone);


/**
 * Given a row of parse CSV data,
 * determine if it corresponds to
 * a daytime period. Returns true
 * if the row corresponds to a daytime
 * period.
 */
const parseDaytime = (row, highFieldName="High") => {
  return row[highFieldName] !== "";
};

/**
 * Given a parsed row object of CSV data,
 * compose a pair of timestamps corresponding to the
 * period portion of the day.
 */
const parseDailyPeriodTimestamps = (row, dateFieldName="Original Date") => {
  let date = dayjs(
    row[dateFieldName],
    "YYYY-MM-DD"
  );

  const morning = date.hour(6).startOf("h").tz(gridTimezone, true).format();
  const night = date.hour(18).startOf("h").tz(gridTimezone, true).format();

  // We return an array of
  // [startTime, endTime]
  if(parseDaytime(row)){
    return [morning, night];
  }
  return [night, morning];
};

/**
 * Given a parsed row object of CSV data,
 * compose the name field based on whether or not
 * the row corresponds to a day or night period.
 */
const parseName = (row, timestamp, rowIndex) => {
  let date = dayjs(timestamp).tz(gridTimezone);
  let dayName = date.format("dddd");
  let isDaytime = parseDaytime(row);
  
  if(rowIndex === 0 && isDaytime){
    dayName = "Today";
  } else if(rowIndex === 0){
    dayName = "Tonight";
  } else if(rowIndex === 1 && !isDaytime){
    dayName = "Tonight";
  } else if(!isDaytime){
    dayName = `${dayName} Night`;
  }

  return dayName;
};

/**
 * Given a parse row object of CSV data,
 * get the temperature as a number
 */
const parseTemperature = (row, tempFieldNameDay="High", tempFieldNameNight="Low") => {
  if(parseDaytime(row)){
    return parseFloat(row[tempFieldNameDay]);
  }
  return parseFloat(row[tempFieldNameNight]);
};

/**
 * Given a parsed row object of CSV data,
 * return an integer corresponding to the
 * percent probability of precipitation
 */
const parsePrecipitation = (row, fieldName="% Precip") => {
  return parseInt(
    row[fieldName].replace("%", "").trim()
  );
};

/**
 * Given a parsed row object of CSV data,
 * return the string corresponding to the
 * shortForecast
 */
const parseShortForecast = (row, fieldName="Condition") => {
  return row[fieldName].trim();
};

const fileData = fs.readFileSync(inputPath);
const rowData = parse(fileData, {columns: true});
const [_gridpoint, _hourly, dailyFilePath] = validateBundle(bundleRoot);
const dailyData = JSON.parse(
  fs.readFileSync(dailyFilePath)
);

const parsedRowData = rowData.map((row, idx) => {
  const [startTime, endTime] = parseDailyPeriodTimestamps(row);
  const isDaytime = parseDaytime(row);
  return {
    number: idx + 1,
    name: parseName(row, startTime, idx),
    startTime,
    endTime,
    isDaytime,
    temperature: parseTemperature(row),
    temperatureUnit: "F",
    probabilityOfPrecipitation: {
      unitCode: "wmoUnit:percent",
      value: parsePrecipitation(row)
    },
    shortForecast: parseShortForecast(row),
    detailedForecast: "",
    icon: row["Icon"]
  };
});

const modifiedDailyData = Object.assign({}, dailyData);
modifiedDailyData.properties.periods = parsedRowData;

fs.writeFileSync(
  "./forecast.json",
  JSON.stringify(modifiedDailyData, null, 2)
);
console.log(`Wrote forecast.json`);
