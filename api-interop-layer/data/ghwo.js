import { createLogger } from "../util/monitoring/index.js";

const logger = createLogger("ghwo");

// Generally, GHWO image URLs use the same risk names as the data, but in a few
// cases, they do not. This is a mapping for those outliers.
const ghwoHazardToImageNameMap = new Map([
  ["ConvectiveWind", "ThunderstormWind"],
  ["Frost/Freeze", "FrostFreeze"],
  ["Marine", "MarineHazard"],
  ["NonConvectiveWind", "Wind"],
  ["SevereThunderstorm", "SevereThunderstorms"],
]);

/**
 * @typedef {Object} GHWODay
 * @property
 */

/**
 * @typedef {Object} GHWOResult
 * @property {number} [status] - HTTP status code indicating the result. This
 *                               is only set if there is an error, but is not
 *                               guaranteed to be set for every error.
 * @property {String} [error]  - If GHWO data could not be fetched for any
 *                               reason, this property is set to a string with
 *                               an explanation of the error.
 * @property {Object} [data]   - If GHWO data is provided, here it is.
 */

/**
 * Get GHWO data for a WFO and county, if available.
 * @param {String} wfoCode - 3-letter WFO code
 * @param {String} county - 5-digit FIPS county code, as string
 * @returns {GHWOResult} The result of this request.
 */
export const getGHWOForWFOAndCounty = async (wfoCode, county) => {
  // All the GHWO URLs expect WFOs to be in lowercase, so... just do that.
  const wfo = wfoCode.toLowerCase();

  const ghwoUrl = `https://www.weather.gov/source/${wfo}/ghwo/hazByCounty.json`;

  const response = await fetch(ghwoUrl);

  // If there's an error, pass the HTTP status code directly back.
  if (response.status > 399) {
    logger.info(`[GHWO] ${ghwoUrl} returned HTTP status ${response.status}`);

    return {
      status: response.status,
      error: `Could not retrieve GHWO for ${wfo.toUpperCase()}`,
    };
  }

  const ghwo = await response.json();

  if (!ghwo?.counties?.[county]) {
    logger.info(`WFO ${wfo.toUpperCase()} does not have county ${county}`);

    return {
      status: 404,
      error: `Could not retrieve GHWO for county ${county} from ${wfo.toUpperCase()}`,
    };
  }

  // We only care about the data for the requested county, so reference that
  // specifically from here on out.
  const data = ghwo.counties[county];

  // GHWO data from the site has day timestamps as keys, which is fine, but
  // generally it's easier to iterate over lists. So we're going to turn the
  // GHWO object into a list and embed the day number and timestamp into each
  // element. This is the array we'll put them all in.
  data.days = [];

  // Get the keys that are timestamps.
  const dayTimestamps = Object.keys(data).filter((key) =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-\d{2}:\d{2}$/.test(key),
  );

  for (const timestamp of dayTimestamps) {
    const dayData = data[timestamp];
    const dayNumber = data.days.length + 1;

    // Mostly we just copy over the data, but we also want to add new data in
    // the form of image URLs.
    dayData.images = {};

    // For every data element in the GHWO, we want to also provide an image URL.
    // The list of data elements is not the same for all WFOs at all times, so
    // we need to build this dynamically.
    const elementKeys = Object.keys(dayData);
    for (const elementKey of elementKeys) {
      // There's no image URL for the daily composite risk, so skip that one.
      if (elementKey !== "DailyComposite") {
        // Sometimes the element key (like "SevereThunderstorm") is not the same
        // key as used in the URL (in this case, "SevereThunderstorms" - note
        // the s at the end). If we have a URL key mapped to the element key,
        // use it. Otherwise just preserve the element key.
        const urlKey = ghwoHazardToImageNameMap.get(elementKey) ?? elementKey;

        // Build the image URL from the WFO, element key, and day number.
        dayData.images[elementKey] =
          `https://www.weather.gov/images/${wfo}/ghwo/${urlKey}Day${dayNumber}.jpg`;
      }
    }

    // Now add the timestamp and day number to our day object.
    dayData.timestamp = timestamp;
    dayData.dayNumber = dayNumber;

    // Push it into the list, and remove the property whose key is the timestamp
    // so we don't have duplication.
    data.days.push(dayData);
    delete data[timestamp];
  }

  return { data };
};
