const fs = require("node:fs/promises");

module.exports.fileExists = async (file) =>
  fs
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);

/**
 * The following is a list of the
 * two-letter (ISO-3166-alpha2) country
 * codes for the USA and its overseas
 * territories.
 * Note that the territories have their
 * own codes
 */
module.exports.US_CODES = [
  "US",
  "GU", // Guam
  "PR", // Puerto Rico
  "AS", // American Samoa
  "MP", // Northern Mariana Islands
  "VI", // US Virgin Islands
  "UM", // US Minor Outlying Islands
];
