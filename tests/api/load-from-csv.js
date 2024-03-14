/* eslint-disable */

import { parse } from "csv-parse/sync";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import * as fs from "fs";
import { resolve } from "path";

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

/**
 * For a given timestamp, return the UTC
 * offset at the end of the stamp.
 * If there is no offset found, return
 * an empty string
 */
const getTimestampOffset = (timestamp) => {
  const regex = /[+-]\d+\:\d\d$/;
  const match = timestamp.match(regex);
  if(match){
    return match[0];
  }
  return "";
};

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
if(!timezone){
  argErrors.push("You must provide a timezone string as the fifth argument, in a format like America/Denver");
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

/**
 * Given a parsed row object of CSV data,
 * compose the correct ISO 8601 timestamp
 * from the date and time text fields
 */
const parseTimestamp = (row, dateFieldName="Original Date", timeFieldName="Original time") => {
  let date = dayjs(
    row[dateFieldName],
    "YYYY-MM-DD"
  );
  const time = dayjs(
    row[timeFieldName],
    "H:mm A"
  );
  date = date.hour(time.hour());
  date = date.minute(time.minute());
  date = date.tz(gridTimezone, true);
  if(date.format() === undefined){
    console.log(row[dateFieldName], row[timeFieldName]);
  }

  return date.format();
};

/**
 * Given a parse row object of CSV data,
 * return an integer representing the
 * percentage chance of precipitation
 */
const parsePrecipitation = (row, precipFieldName="% precip") => {
  const cleanText = row[precipFieldName].replace("%", "").trim();
  return parseInt(cleanText);
};

/**
 * Given a parsed row object of CSV data,
 * return a float representing the
 * dewpoint
 */
const parseDewpoint = (row, dewpointFieldName="Dewpoint") => {
  return parseFloat(row[dewpointFieldName]);
};

/**
 * Given a parsed row object of CSV data,
 * return a size 2 array containing the
 * parsed wind speed and the parsed
 * wind direction
 */
const parseWind = (row, windFieldName="Wind speed") => {
  const split = row[windFieldName].split(" ");
  return [
    parseFloat(split[0]),
    split[1]
  ];
};

/**
 * Given a parsed row object of CSV data,
 * return a float representing the
 * feels like temperature
 */
const parseFeelsLike = (row, feelsLikeFieldName="Feels like (wc)") => {
  return parseFloat(row[feelsLikeFieldName]);
};

/**
 * Given a parsed row object of CSV data,
 * return an integer corresponding to the
 * relative humidity percentage
 */
const parseHumidity = (row, humidityFieldName="Humidity") => {
  return parseInt(
    row[humidityFieldName].replace("%", "")
  );
};

/**
 * Output the temperature object, with
 * timestamps and correct values, in the
 * gridpoints format
 */
const getGridPointTemperature = (rows, unit="F") => {
  return {
    uom: `wmooUnit:deg${unit}`,
    values: rows.map(row => {
      return {
        validTime: `${row.timestamp}/PT1H`,
        value: row.temperature
      };
    })
  }; 
};

/**
 * Output the change of precipitation,
 * with timestamps and correct values,
 * in the gridpoints format
 */
const getGridPointPrecipitation = (rows) => {
  return {
    uom: "wmoUnit:percent",
    values: rows.map(row => {
      return {
        validTime: `${row.timestamp}/PT1H`,
        value: row.probabilityOfPrecipitation
      };
    })
  };
};

/**
 * Output the dewpoint, with timestamps
 * and correct values, in the gridpoints
 * format
 */
const getGridPointDewpoint = (rows, unit="F") => {
  return {
    uom: `wmoUnit:deg${unit}`,
    values: rows.map(row => {
      return {
        validTime: `${row.timestamp}/PT1H`,
        value: row.dewpoint
      };
    })
  };
};

/**
 * Output the wind speed with timestamps
 * and correct values in mph in the
 * gridpoints format
 */
const getGridPointWindSpeed = (rows, unit="m_h") => {
  return {
    oum: `wmoUnit:${unit}`,
    values: rows.map(row => {
      return {
        validTime: `${row.timestamp}/PT1H`,
        value: row.windSpeed
      };
    })
  };
};

/**
 * Output the wind direction with timestamps
 * and correct (degrees) values in the
 * gridpoints format
 */
const getGridPointWindDirection = (rows, unit="degree_(angle)") => {
  return {
    uom: `wmoUnit:${unit}`,
    values: rows.map(row => {
      return {
        validTime: `${row.timestamp}/PT1H`,
        value: cardinalToDegrees(row.windDirection)
      };
    })
  };
};

/**
 * Output the feels like temperature
 * with correct timestamps and values
 * in the gridpoints format
 */
const getGridPointFeelsLike = (rows, unit="F") => {
  return {
    uom: `wmoUnit:deg${unit}`,
    values: rows.map(row => {
      return {
        validTime: `${row.timestamp}/PT1H`,
        value: row.feelsLike
      };
    })
  };
};

/**
 * Output the relative humidity with the
 * correct timestamps and values
 */
const getGridPointRelativeHumidity = (rows) => {
  return {
    uom: "wmoUnit:percent",
    values: rows.map(row => {
      return {
        validTime: `${row.timestamp}/PT1H`,
        value: row.relativeHumidity
      };
    })
  };
};

/**
 * For a given object representing raw gridpoint
 * API data, use parsed row data to modify the relevant
 * values.
 * Returns a new object.
 */
const getModifiedGridPointData = (gridpointData, parsedRows) => {
  const updatedProperties = Object.assign(
    {},
    gridpointData.properties,
    {
      windSpeed: getGridPointWindSpeed(parsedRows),
      windDirection: getGridPointWindDirection(parsedRows),
      windChill: getGridPointFeelsLike(parsedRows),
      dewpoint: getGridPointDewpoint(parsedRows),
      probabilityOfPrecipitation: getGridPointPrecipitation(parsedRows),
      temperature: getGridPointTemperature(parsedRows),
      relativeHumidity: getGridPointRelativeHumidity(parsedRows)
    }
  );
  return Object.assign({}, gridpointData, {properties: updatedProperties});
};

/**
 * For a given object representing raw hourly
 * forecast data, used parsed row data and compose
 * new periods with modified forecast information
 */
const getModifiedHourlyData = (hourlyData, parsedRows) => {
  const modifiedProperties = Object.assign(
    {},
    hourlyData.properties,
    {
      periods: parsedRows.map((row, idx) => {
        return {
          number: idx + 1,
          startTime: row.timestamp,
          endTime: dayjs(row.timestamp).tz(gridTimezone).add(1, "h").format(),
          temperature: row.temperature,
          temperatureUnit: "F",
          probabilityOfPrecipitation: {
            unitCode: "wmoUnit:percent",
            value: row.probabilityOfPrecipitation
          },
          dewpoint: {
            unitCode: "wmoUnit:degF",
            value: row.dewpoint
          },
          relativeHumidity: {
            unitCode: "wmoUnit:percent",
            value: row.relativeHumidity
          },
          windSpeed: `${row.windSpeed} mph`,
          windDirection: row.windDirection,
          icon: row.icon,
          shortForecast: row.shortForecast,
          detailedForecast: ""
        };
      })
    }
  );

  return Object.assign(
    {},
    hourlyData,
    {properties: modifiedProperties}
  );
};

const fileData = fs.readFileSync(inputPath);
const rowData = parse(fileData, {columns: true});
const [gridpointPath, hourlyPath] = validateBundle(bundleRoot);
const gridpointData = JSON.parse(
  fs.readFileSync(gridpointPath)
);
const hourlyData = JSON.parse(
  fs.readFileSync(hourlyPath)
);

const parsedRowData = rowData.map((row) => {
  const [windSpeed, windDirection] = parseWind(row);
  return {
    timestamp: parseTimestamp(row),
    temperature: parseFloat(row["Temp"]),
    probabilityOfPrecipitation: parsePrecipitation(row),
    dewpoint: parseDewpoint(row),
    feelsLike: parseFeelsLike(row),
    relativeHumidity: parseHumidity(row),
    shortForecast: row["Condition"],
    icon: row["Icon"],
    windSpeed,
    windDirection
   };
});

const modifiedGridPointData = getModifiedGridPointData(

  gridpointData,
  parsedRowData
);

fs.writeFileSync(
  "./gridpoint.json",
  JSON.stringify(modifiedGridPointData, null, 2)
);
console.log("Wrote gridpoint.json");

const modifiedHourlyData = getModifiedHourlyData(
  hourlyData,
  parsedRowData
);

fs.writeFileSync(
  "./hourly.json",
  JSON.stringify(modifiedHourlyData, null, 2)
);
console.log("Wrote hourly.json");
