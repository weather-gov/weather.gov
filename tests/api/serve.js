import fs from "fs/promises";
import path from "path";

import config from "./config.js";
import proxy from "./proxy.js";

const dataPath = "./data";

const exists = async (file) => {
  try {
    await fs.access(file, fs.constants.F_OK);
    return true;
  } catch (e) {
    return false;
  }
};

const adjust = (time, adjustment) => {
  const [amount, unit] = adjustment.trim().split(" ");
  if (amount && unit) {
    return time.add(Number.parseInt(amount, 10), unit);
  }
  return time;
};

const processDates = (obj, usingHourly = false, { parent = null } = {}) => {
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
      processDates(value, usingHourly, { parent: key });
    }
    //
    // But if the value has a startsWith function and it starts with the token,
    // we've got a thing that needs parsing.
    else if (/^date:\S+/.test(value)) {
      const [, start, modifier] = value.match(/^date:(\S+)\s(.*)/);

      let updatedTime = now;

      if (start === "now" && modifier) {
        updatedTime = adjust(updatedTime, modifier);

        // If we are parsing hourly forcast data, and the key is either the
        // start or end time, then align the output to the start of the given
        // hour.
        //
        // Alternatively, if we are not parsing hourly data but our parent key
        // is "values" and our key is "validTime", then this is the hourly data
        // stuffed inside the gridpoints API return. Do the same thing.
        if (
          (usingHourly &&
            ["startTime", "endTime", "validTime"].includes(key)) ||
          (!usingHourly && parent === "values" && key === "validTime")
        ) {
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

export default async (request, response) => {
  // Put the query string back together.
  const query = Object.entries(request.query)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  // The file path is the request path plus the query string, if any.
  const filePath = `${path.join(dataPath, config.play, request.path)}${
    query.length > 0 ? "__" : ""
  }${query}.json`;

  const fileExists = await exists(filePath);
  console.log(`NOW_TIME: Set from ${config.nowMethod} as ${config.now}`);

  if (!fileExists) {
    console.log(`LOCAL:    local file does not exist; proxying [${filePath}]`);
    await proxy(request, response);
  } else {
    console.log(`LOCAL:    serving local file: ${filePath}`);
    const output = JSON.parse(await fs.readFile(filePath));

    if (output["@bundle"]?.status) {
      console.log(
        `LOCAL:    local file has response status ${output["@bundle"].status}`,
      );
      response.writeHead(output["@bundle"].status);
      response.end();
      return;
    }

    const isHourlyForecast = filePath.toString().includes("hourly");

    processDates(output, isHourlyForecast);

    response.writeHead(200, {
      server: "weather.gov dev proxy",
      "Content-Type": "application/geo+json",
      "access-control-allow-origin": "*",
      "access-control-expose-headers":
        "X-Correlation-Id, X-Request-Id, X-Server-Id",
    });
    response.write(JSON.stringify(output, null, 2));
    response.end();
  }
};
