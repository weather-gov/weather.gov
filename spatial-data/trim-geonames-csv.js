/**
 * This file takes an original citiesXXXX.txt
 * (probably cities500.txt) file and trims it
 * down to only the rows we want to use.
 * These will be rows whose country code is US
 * or any of the US overseas territories
 */
const fs = require("node:fs/promises");


/**
 * The following is a list of the
 * two-letter (ISO-3166-alpha2) country
 * codes for the USA and its overseas
 * territories.
 * Note that the territories have their
 * own codes
 */
const US_CODES = [
  "US",
  "GU", // Guam
  "PR", // Puerto Rico
  "AS", // American Samoa
  "MP", // Northern Mariana Islands
  "VI", // US Virgin Islands
  "UM" // US Minor Outlying Islands
];

const FILENAME = "cities500.txt";
const OUTFILE_NAME = "us.cities500.txt";

// eslint-disable-next-line no-unused-vars
const COLUMN_NAMES = [
  "geonameId",
  "name",
  "asciiName",
  "alternateNames",
  "lat",
  "lon",
  "featureClass",
  "featureCode",
  "countryCode",
  "cc2",
  "admin1",
  "admin2",
  "admin3",
  "admin4",
  "population",
  "elevation",
  "dem",
  "timezone",
  "modified"
];

async function main(){
  const fileText = await fs.readFile(`./data/${FILENAME}`, { encoding: "utf-8"} );
  const rows = fileText.split("\n")
        .map(line => line.trim().split("\t"))
        .filter(row => US_CODES.includes(row[8]))
        .map(row => row.join("\t"));
  console.log(rows.length);
  await fs.writeFile(`./data/${OUTFILE_NAME}`, rows.join("\n"));
};

main();
