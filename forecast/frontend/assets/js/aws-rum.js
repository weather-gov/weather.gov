const config = {
  sessionSampleRate: 1.0,
  identityPoolId: "us-east-1:41d5720b-94ad-45e5-b216-4e8d6c8e28b8",
  endpoint: "https://dataplane.rum.us-east-1.amazonaws.com",
  telemetries: ["performance", "errors", "http"],
  allowCookies: true,
  enableXRay: false,
  signing: true, // If you have a public resource policy and wish to send unsigned requests please set this to false
  disableAutoPageView: true,
};
const APPLICATION_ID = "43e31d84-e535-442f-a822-ec499fd2ffc5";
const APPLICATION_VERSION = "1.0.0";
const APPLICATION_REGION = "us-east-1";
(function (n, i, v, r, s, c, x, z) {
  /* eslint-disable-next-line no-param-reassign */
  x = window.AwsRumClient = {
    q: [],
    n: n,
    i: i,
    v: v,
    r: r,
    c: c,
  };
  window[n] = function (c, p) {
    x.q.push({ c: c, p: p });
  };
  /* eslint-disable-next-line no-param-reassign */
  z = document.createElement("script");
  z.async = true;
  z.src = s;
  document.head.insertBefore(z, document.getElementsByTagName("script")[0]);
})(
  "cwr",
  APPLICATION_ID,
  APPLICATION_VERSION,
  APPLICATION_REGION,
  "https://client.rum.us-east-1.amazonaws.com/1.x/cwr.js",
  config,
);
const pageGroups = (path) => {
  const match = path.match(
    /^\/(forecast\/county|forecast\/state|cms|forecast\/point|place)/,
  );
  if (!match) {
    // this pathname is not part of a RUM page group
    return null;
  }
  const what = match[1];
  // rename endpoints for clarity on the RUM side
  switch (what) {
    case "forecast/point":
      return "forecast";
    case "forecast/county":
      return "county";
    case "forecast/state":
      return "state";
    default:
      return what;
  }
};

const isUsingHTMX = () => {
  // We determine if we are using HTMX by checking that the
  // HTMX script element is on the page
  const script = document.querySelector(`script[src*="point-htmx.js"]`);
  if (script) {
    return true;
  }
  return false;
};

const getPointForecastPageName = (path) => {
  const match = path.match(
    /^\/forecast\/point\/[0-9-.]+\/[0-9-.]+\/(alerts|analysis|7-day|today|maps)/,
  );
  if (!match) {
    return null;
  }
  return match[1];
};

// set up a IIFE so we capture a page group if applicable
(function () {
  // Add event listeners for TabbedNavigator interactions.
  // If we are using HTMX, we will also want to add listeners
  // for when the tab content loads

  // When a user switches to another tab
  // in any TabbedNavigator
  document.addEventListener("wx:tab-switched", (event) => {
    const rumEventData = {
      path: window.location.pathname,
      isPointPage: !!window.location.pathname.match(/\/forecast\/point/),
      usingHTMX: isUsingHTMX(),
      tabId: event.detail.tabId,
    };
    cwr("recordEvent", { type: "tabbed_nav_click", data: rumEventData });
  });

  // When tab contents have loaded behind the scenes
  // via HTMX-like functionality
  document.addEventListener("wx:tab-content-loaded", (event) => {
    const rumEventData = {
      path: window.location.pathname,
      isPointPage: !!window.location.pathname.match(/\/forecast\/point/),
      usingHTMX: isUsingHTMX(),
      tabId: event.detail.tabId,
    };
    cwr("recordEvent", { type: "tab_content_loaded", data: rumEventData });
  });

  // When there was an error loading tab contents in the background
  // using HTMX like functionality
  document.addEventListener("wx:tab-content-error", (event) => {
    const rumEventData = {
      path: window.location.pathname,
      isPointPage: !!window.location.pathname.match(/\/forecast\/point/),
      usingHTMX: isUsingHTMX(),
      tabId: event.detail.tabId,
      errorCode: event.detail.status,
    };
    cwr("recordEvent", { type: "tab_content_error", data: rumEventData });
  });

  const pathname = window.location.pathname;
  const pageGroup = pageGroups(pathname);

  // Record the general pageview
  if (pageGroup) {
    cwr("recordPageView", { pageId: pathname, pageTags: [pageGroup] });
  } else {
    cwr("recordPageView", { pageId: pathname });
  }

  // Next, record pageview information for the point forecast pages,
  // tagging them as need with the HTMX state
  const pointPageTags = ["point-forecast", getPointForecastPageName(pathname)];
  if (isUsingHTMX()) {
    pointPageTags.push("using-htmx");
  }
  cwr("recordPageView", { pageId: pathname, pageTags: pointPageTags });
})();
