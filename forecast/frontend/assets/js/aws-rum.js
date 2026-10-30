/**
 * Pull the application ID from a specific meta tag, if the tag is there.
 * If it is not present, the given environment is not set up for using RUM.
 */
const getRUMApplicationId = () => {
  const tag = document.querySelector(`meta[data-name="aws-rum-app-id"]`);
  if (!tag || !tag.getAttribute("content")) {
    console.warn(`No valid RUM application id found in markup.`);
    return null;
  }
  return tag.getAttribute("content");
};

/**
 * General configuration for our environment(s)
 */
const config = {
  sessionSampleRate: 1.0,
  identityPoolId: "us-east-1:d53843c8-350a-4c14-a929-8c0b2844cf62",
  endpoint: "https://dataplane.rum.us-east-1.amazonaws.com",
  telemetries: ["performance", "errors", "http"],
  allowCookies: true,
  enableXRay: false,
  signing: true, // If you have a public resource policy and wish to send unsigned requests please set this to false
  disableAutoPageView: true,
  customEvents: { enabled: true },
};

/**
 * Extracted version of the anonymous function in snippet used for creating
 * the RUM client and attaching it to the window as a global.
 */
const createAwsRumClient = (name, id, version, region, scriptSrc, config) => {
  window.AwsRumClient = {
    q: [],
    n: name,
    i: id,
    v: version,
    r: region,
    c: config,
  };

  window[name] = function (config, p) {
    window.AwsRumClient.q.push({ c: config, p });
  };

  const scriptTag = document.createElement("script");
  scriptTag.async = true;
  scriptTag.src = scriptSrc;
  document.head.insertBefore(
    scriptTag,
    document.getElementsByTagName("script")[0],
  );
};

/**
 * Helper function for determining page groups based on the
 * provided path. Used for giving stable labels to different kinds
 * of URLs.
 */
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
  const script = document.querySelector(`script[src*="point-htmx"]`);
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

/**
 * Sets up the various page views and custom events
 * that we want to record.
 * This function should be run after the RUM client is
 * successfully initialized, as it expects there to be a
 * global (window) function named 'cwr'
 */
const setupRecording = () => {
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
    window.cwr("recordEvent", { type: "tabbed_nav_click", data: rumEventData });
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
    window.cwr("recordEvent", {
      type: "tab_content_loaded",
      data: rumEventData,
    });
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
    window.cwr("recordEvent", {
      type: "tab_content_error",
      data: rumEventData,
    });
  });

  const pathname = window.location.pathname;
  const pageTags = [];

  // Get the initial "page name" tag.
  // This will be the type of page, ie
  // 'forecast', 'county', 'state' or the literal
  // url in all other cases
  const pageTypeTag = pageGroups(pathname);
  if (pageTypeTag) {
    pageTags.push(pageTypeTag);
  }

  // Next, check to see if this is a point forecast page or
  // not. If so, add the 'point-forecast' tag, as well as the
  // specific tab page name tag for point forecasts
  const pointForecastTabPageName = getPointForecastPageName(pathname);
  if (pointForecastTabPageName) {
    pageTags.push("point-forecast", pointForecastTabPageName);
  }

  // If we are in 'HTMX' mode, lets add that as a tag
  // as well
  if (isUsingHTMX()) {
    pageTags.push("using-htmx");
  }

  // Finally, record the pageView
  if (pageTags.length) {
    window.cwr("recordPageView", { pageId: pathname, pageTags });
  } else {
    window.cwr("recordPageView", { pageId: pathname });
  }
};

/**
 * Initialize the RUM client if there is a valid application id,
 * then set up the kinds of page views and custom events
 * we want to record.
 * Note that an invalid or missing application id will return early
 */
(function () {
  // If there is not a valid application id, immediately
  // return to prevent initialization of RUM.
  const APPLICATION_ID = getRUMApplicationId();
  if (!APPLICATION_ID) {
    return;
  }
  const APPLICATION_VERSION = "1.0.0";
  const APPLICATION_REGION = "us-east-1";

  // Initialize the RUM client on the window
  createAwsRumClient(
    "cwr",
    APPLICATION_ID,
    APPLICATION_VERSION,
    APPLICATION_REGION,
    "https://client.rum.us-east-1.amazonaws.com/1.x/cwr.js",
    config,
  );

  // Set up the page views and custom events for recording
  setupRecording();
})();
