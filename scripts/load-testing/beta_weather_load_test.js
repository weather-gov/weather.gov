import { group, check } from "k6";
import { Counter } from "k6/metrics";
import exec from "k6/execution";
import http from "k6/http";

// grid.json is a traffic-weighted lat/lon dataset from weather.gov.
const gridData = JSON.parse(open("./data/grid.json"));

// `just generate-counties` generates county FIPs
const countyData = JSON.parse(open("./data/counties.json"));
// `just generate-counties` generates state abbrevs
const stateData = JSON.parse(open("./data/states.json"));
// `just generate-coastal-zones` generates marine coastal zone ids
const coastalZoneData = JSON.parse(open("./data/coastal_zones.json"));

// load testing variables that can be overridden.
const TARGET_RPS = Number(__ENV.TARGET_RPS || 30);
const BETA_WEATHER_BASE_URI =
  __ENV.BETA_WEATHER_BASE_URI || "https://weathergov-staging.app.cloud.gov";
const DURATION_MINUTES = Number(__ENV.DURATION_MINUTES || 5);
const REQUEST_TIMEOUT_SECONDS = Number(__ENV.REQUEST_TIMEOUT_SECONDS || 120);

// each page has its own weight (how often we should load test that page) and tabs
const pages = {
  forecast: {
    weight: 40,
    pickKey: () => {
      const { lat, lon } = pickGridPoint();
      // beta forecast accepts 3 decimal places, so reformat accordingly.
      return `${lat.toFixed(3)}/${lon.toFixed(3)}`;
    },
    path: (key) => `/forecast/point/${key}/`,
    tabs: ["", "alerts/", "today/", "7-day/", "maps/", "analysis/"],
    p95metric: 3000,
  },
  county: {
    weight: 8,
    pickKey: () => pickRandom(countyData),
    path: (key) => `/forecast/county/${key}/`,
    tabs: ["", "risk-overview/"],
    p95metric: 2000,
  },
  state: {
    weight: 4,
    pickKey: () => pickRandom(stateData),
    path: (key) => `/forecast/state/${key}/`,
    tabs: ["", "alerts/", "risks/", "radar/", "analysis/"],
    p95metric: 2000,
  },
  marine: {
    weight: 4,
    pickKey: () => pickRandom(coastalZoneData),
    path: (key) => `/forecast/marine/coastal/${key}/`,
    tabs: ["", "alerts/", "forecast/", "conditions/"],
    p95metric: 1000,
  },
};

// k6 options.
export const options = {
  summaryTrendStats: ["avg", "min", "p(50)", "p(75)", "p(90)", "p(95)", "max"],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
    dropped_iterations: ["count==0"],
    ...Object.fromEntries(
      Object.entries(pages).map(([name, page]) => [
        `http_req_duration{name:${name}}`,
        [`p(95)<${page.p95metric}`],
      ]),
    ),
  },
  scenarios: {
    constant_load: {
      executor: "constant-arrival-rate",
      rate: TARGET_RPS,
      timeUnit: "1s",
      duration: `${DURATION_MINUTES}m`, // for production, we can go up to 10m
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

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)]; // nosemgrep
}

// precalculate the cumulative weights (ex: [30/33, 32/33, 33/33])
const pageTypes = Object.keys(pages);
const cumulativeWeights = (() => {
  const total = pageTypes.reduce((sum, type) => sum + pages[type].weight, 0);
  const cumulative = new Array(pageTypes.length);
  let running = 0;
  for (let i = 0; i < pageTypes.length; i++) {
    running += pages[pageTypes[i]].weight;
    cumulative[i] = running / total;
  }
  return cumulative;
})();

function pickPageType() {
  const r = Math.random(); // nosemgrep
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (r < cumulativeWeights[i]) {
      return pageTypes[i];
    }
  }
  return pageTypes[pageTypes.length - 1];
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

const marineCounter = new Counter("marine");
const notCoveredCounter = new Counter("not_covered");
const rateLimitedCounter = new Counter("rate_limited");

export default function (data) {
  const type = pickPageType();
  const page = pages[type];
  const url = `${BETA_WEATHER_BASE_URI}${page.path(page.pickKey())}${pickRandom(page.tabs)}`;
  group(`beta ${type} request`, function () {
    requestBetaUrl(url, type);
  });
}

function requestBetaUrl(url, name) {
  let response = http.get(url, {
    tags: { name },
    timeout: `${REQUEST_TIMEOUT_SECONDS}s`,
  });

  // cloud.gov can rate limit us and return 202 ("i'll deal with this later")
  // we really can't do anything here except abort.
  if (response.status === 202) {
    exec.test.abort(`rate limited by cloud.gov (202) on ${url}`);
  }
  // alternatively if we get these then either the API has given us errors or
  // the interop is overloaded. in either case increment the counter.
  if (response.status === 403 || response.status === 429) {
    rateLimitedCounter.add(1, { status: String(response.status) });
  }

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
        // pages that made no interop call embed `null` timings.
        const timings = JSON.parse(regexp[1]) || {};
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
