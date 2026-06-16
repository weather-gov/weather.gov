import { group, check } from "k6";
import { Counter } from "k6/metrics";
import http from "k6/http";

// grid.json is a traffic-weighted lat/lon dataset from weather.gov.
const gridData = JSON.parse(open("./data/grid.json"));
// counties.json is a list of supported county fips for beta.weather.gov and
// based on the county shape file at
// https://www.weather.gov/source/gis/Shapefiles/County/c_18mr25.zip
const countyData = JSON.parse(open("./data/counties.json"));

const REQUEST_TIMEOUT_SECONDS = "120s";

export const options = {
  summaryTrendStats: ["avg", "min", "p(50)", "p(75)", "p(90)", "p(95)", "max"],
  scenarios: {
    constant_load: {
      executor: "constant-arrival-rate",
      rate: 30, // for production, we can go up to 50 rps
      timeUnit: "1s",
      duration: "5m", // for production, we can go up to 10m
      preAllocatedVUs: 500, // 50 req/s * 20s expected response time
      maxVUs: 1000, // allow scaling for response time spikes
      gracefulStop: "60s",
    },
  },
  cloud: {
    name: __ENV.TEST_NAME || "Unknown test name",
    distribution: {
      "amazon:us:ashburn": { loadZone: "amazon:us:ashburn", percent: 25 },
      "amazon:us:columbus": {
        loadZone: "amazon:us:columbus",
        percent: 25,
      },
      "amazon:us:palo alto": {
        loadZone: "amazon:us:palo alto",
        percent: 25,
      },
      "amazon:us:portland": {
        loadZone: "amazon:us:portland",
        percent: 25,
      },
    },
  },
};

const BETA_WEATHER_BASE_URI =
  __ENV.BETA_WEATHER_BASE_URI || "https://weathergov-staging.app.cloud.gov";

// relative frequencies for each request type, based on traffic.
const requestWeights = {
  forecast: 30,
  county: 2,
  riskoverview: 1,
};

// precalculate the cumulative weights (ex: [30/33, 32/33, 33/33])
const requestTypes = Object.keys(requestWeights);
const cumulativeWeights = (() => {
  const total = requestTypes.reduce(
    (sum, type) => sum + requestWeights[type],
    0,
  );
  const cumulative = new Array(requestTypes.length);
  let running = 0;
  for (let i = 0; i < requestTypes.length; i++) {
    running += requestWeights[requestTypes[i]];
    cumulative[i] = running / total;
  }
  return cumulative;
})();

function pickRequestType() {
  const r = Math.random(); // nosemgrep
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (r < cumulativeWeights[i]) {
      return requestTypes[i];
    }
  }
  return requestTypes[requestTypes.length - 1];
}

// grid weights are normalized. so precompute the cumulative array.
const gridCumulativeWeights = (() => {
  const cumulative = new Array(gridData.weights.length);
  let running = 0;
  for (let i = 0; i < gridData.weights.length; i++) {
    running += gridData.weights[i];
    cumulative[i] = running;
  }
  return cumulative;
})();

// do a binary search per sample. this is essentially inverse CDF sampling.
function pickGridPoint() {
  const r = Math.random(); // nosemgrep
  let lo = 0;
  let hi = gridCumulativeWeights.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (gridCumulativeWeights[mid] < r) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  const [lat, lon] = gridData.points[lo];
  return {
    lat: lat + Math.random() * gridData.gridSize, // nosemgrep
    lon: lon + Math.random() * gridData.gridSize, // nosemgrep
  };
}

function pickCountyFips() {
  return countyData[Math.floor(Math.random() * countyData.length)]; // nosemgrep
}

const marineCounter = new Counter("marine");
const notCoveredCounter = new Counter("not_covered");

export default function (data) {
  const mode = pickRequestType();
  switch (mode) {
    case "forecast":
      const { lat, lon } = pickGridPoint();
      // beta forecast accepts 3 decimal places, so reformat accordingly.
      const latitude = lat.toFixed(3);
      const longitude = lon.toFixed(3);
      const forecastUrl = `${BETA_WEATHER_BASE_URI}/forecast/point/${latitude}/${longitude}/`;
      group("beta forecast request", function () {
        requestBetaUrl(forecastUrl, mode);
      });
      break;
    case "county":
      const fips = pickCountyFips();
      const countyUrl = `${BETA_WEATHER_BASE_URI}/forecast/county/${fips}/`;
      group("beta county request", function () {
        requestBetaUrl(countyUrl, mode);
      });
      break;
    case "riskoverview":
      const ghwoFips = pickCountyFips();
      const ghwoUrl = `${BETA_WEATHER_BASE_URI}/forecast/county/${ghwoFips}/risk-overview/`;
      group("beta risk overview request", function () {
        requestBetaUrl(ghwoUrl, mode);
      });
      break;
    default:
      console.log(`request mode ${mode} is not implemented`); // eslint-disable-line no-console
      break;
  }
}

function requestBetaUrl(url, name) {
  let response = http.get(url, {
    tags: { name },
    timeout: REQUEST_TIMEOUT_SECONDS,
  });

  // separately track marine because this is not supported on beta right now.
  const isMarine =
    response.status === 404 && response.body.includes("Marine forecasts");
  const isNotCovered =
    response.status === 404 &&
    response.body.includes(
      "The requested location is not covered by the National Weather Service",
    );
  if (isMarine) {
    marineCounter.add(1);
  } else if (isNotCovered) {
    notCoveredCounter.add(1);
  } else {
    if (response.status == 200) {
      const body = response.body;
      const regexp = body.match(
        /BEGIN_INTEROP_TIMINGS(.*?)END_INTEROP_TIMINGS/s,
      );
      if (regexp) {
        const timings = JSON.parse(regexp[1]);
        timings["url"] = url;
        timings["k6_timing"] = response.timings.duration;
        if (response.headers && response.headers["X-Django-Timing-Ms"]) {
          timings["django_timing"] = response.headers["X-Django-Timing-Ms"];
        }
        timings["response_code"] = 200;
        console.log(JSON.stringify(timings)); // eslint-disable-line no-console
      }
    }

    if (
      !check(response, {
        "beta weather request status is OK": (r) => r.status === 200,
      })
    ) {
      const failed_data = {
        response_code: response.status,
        url: url,
      };
      console.log(JSON.stringify(failed_data)); // eslint-disable-line no-console
    }
  }
}
