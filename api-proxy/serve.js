import config from "./config.js";
import { localData } from "./data.js";
import logger from "./logger.js";
import proxy from "./proxy.js";

const serveLogger = logger.child({ subsystem: "file service" });

const adjust = (time, adjustment) => {
  const [amount, unit] = adjustment.trim().split(" ");
  if (amount && unit) {
    return time.add(Number.parseInt(amount, 10), unit);
  }
  return time;
};

const processDates = (obj, usingHourly = false) => {
  // If the input is null, just bail out. Otherwise we'll accidentally turn it
  // into an object.
  if (obj === null) {
    return;
  }

  const { now } = config;

  // Recursively search through the object to find all values that have the
  // date:now token so we can process those into proper ISO8601 timestamps.
  Object.entries(obj ?? {}).forEach(([key, value]) => {
    // For arrays and objects, recurse into them
    if (Array.isArray(value)) {
      value.forEach((item) => processDates(item, usingHourly, { parent: key }));
    } else if (typeof value === "object" && value !== null) {
      processDates(value, usingHourly);
    }
    //
    // But if the value has a startsWith function and it starts with the token,
    // we've got a thing that needs parsing.
    else if (/^date:\S+/.test(value)) {
      const [, start, modifier] = value.match(/^date:(\S+)\s(.*)/);

      let updatedTime = now;

      if (start === "now" && modifier) {
        updatedTime = adjust(updatedTime, modifier);

        // If the object key is in this list, then we may need to align the
        // output to the start of the given hour.
        const isAlignKey = ["startTime", "endTime", "validTime"].includes(key);

        // If we are processing hourly data AND this is one of the keys that
        // needs to be aligned to the start of the hour
        if (usingHourly && isAlignKey) {
          updatedTime = updatedTime.startOf("hour");
        }
      } else if (start === "today") {
        const [, hour, minute, offset, adjustment] = modifier.match(
          /^(\d{2}):(\d{2}):([-+]?\d{1,2})(.*)/,
        );

        updatedTime = updatedTime
          .utcOffset(Number.parseInt(offset, 10))
          .hour(+hour)
          .minute(+minute)
          .second(0)
          .millisecond(0);

        if (adjustment.trim()) {
          updatedTime = adjust(updatedTime, adjustment);
        }
      }

      obj[key] = updatedTime.format();

      // If there's a duration component, smoosh it on to the end of our
      // generated timestamp so it'll match the ISO8601 time+duration format.
      const [, duration] = value.split(" / ");
      if (duration) {
        obj[key] = `${obj[key]}/${duration}`;
      }
    }
  });
};

const processRiskOverviewDates = (riskOverviewData) => {
  const { now } = config;

  // The original timestamps are the _keys_ in the
  // result object for each county.
  Object.keys(riskOverviewData.counties).forEach((fips) => {
    const countyData = riskOverviewData.counties[fips];

    Object.keys(countyData)
      .filter((key) => {
        // Filter out any keys that are not a dynamic
        // timestamp
        return /^date:\S+/.test(key);
      })
      .forEach((dynamicTimestamp) => {
        const [, start, modifier] = dynamicTimestamp.match(/^date:(\S+)\s(.*)/);
        let updatedTime = now;

        if (start === "now" && modifier) {
          updatedTime = adjust(updatedTime, modifier);
        } else if (start === "today") {
          const [, hour, minute, offset, adjustment] = modifier.match(
            /^(\d{2}):(\d{2}):([-+]?\d{1,2})(.*)/,
          );

          updatedTime = updatedTime
            .utcOffset(Number.parseInt(offset, 10))
            .hour(+hour)
            .minute(+minute)
            .second(0)
            .millisecond(0);

          if (adjustment.trim()) {
            updatedTime = adjust(updatedTime, adjustment);
          }
        }

        let newTimestamp = updatedTime.format();

        // If there's a duration component, smoosh it on to the end of our
        // generated timestamp so it'll match the ISO8601 time+duration format.
        const [, duration] = dynamicTimestamp.split(" / ");
        if (duration) {
          newTimestamp = `${newTimestamp}/${duration}`;
        }

        // Swap the dynamickey out for the new key,
        // preserving the same data
        countyData[newTimestamp] = countyData[dynamicTimestamp];
        delete countyData[dynamicTimestamp];
      });
  });

  return riskOverviewData;
};

export default async (request, response) => {
  // See if we have data for this URL. If not, proxy it.
  if (!localData.has(request.originalUrl)) {
    serveLogger.info(
      { path: request.originalUrl },
      "local file does not exist; proxying",
    );
    await proxy(request, response);
  } else {
    // Otherwise, serve that sucker.
    serveLogger.info({ path: request.originalUrl }, "serving local file");
    const output = localData.get(request.originalUrl);

    const delay = config.delay
      ? new Promise((resolve) => {
          serveLogger.trace(
            { path: request.originalUrl, delay: config.delay },
            "delaying response",
          );
          setTimeout(() => {
            serveLogger.trace(
              { path: request.originalUrl, delay: config.delay },
              "delay has elapsed",
            );
            resolve();
          }, config.delay);
        })
      : Promise.resolve();

    // If the bundle contains a `now` key, override any
    // configured value for the current time with the timestamp
    // present in the bundle
    if (output["@bundle"]?.now) {
      config.now = output["@bundle"].now;
    }

    if (output["@bundle"]?.status) {
      serveLogger.info(
        { status: output["@bundle"].status },
        "local file has response status",
      );
      response.writeHead(output["@bundle"].status);
      response.end();
      return;
    }

    // We know this is hourly forecast data if it's somewhere in the /gridpoints
    // tree and EITHER ends after the WFO grid OR ends with /forecast/hourly.
    const isHourlyForecast =
      /\/gridpoints\/[A-Z]{3}\/\d+,\d+(\/forecast\/hourly)?/.test(request.path);

    const isRiskOverviewRequest = request.path.endsWith("hazByCounty.json");

    if (isRiskOverviewRequest) {
      processRiskOverviewDates(output);
    } else {
      processDates(output, isHourlyForecast);
    }

    await delay;

    response.writeHead(200, {
      server: "weather.gov dev proxy",
      "Content-Type": "application/geo+json",
      "access-control-allow-origin": "*",
      "access-control-expose-headers":
        "X-Correlation-Id, X-Request-Id, X-Server-Id",
    });
    response.write(JSON.stringify(output, null, 2));
    response.end();
    serveLogger.trace({ path: request.originalUrl }, "finished serving");
  }
};
