const config = {
  sessionSampleRate: 0.2,
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
  const match = path.match(/^\/(county|state|cms|point|place)/);
  if (!match) {
    // this pathname is not part of a RUM page group
    return null;
  }
  const what = match[1];
  // rename "point" to "forecast"
  return what === "point" ? "forecast" : what;
};
// set up a IIFE so we capture a page group if applicable
(function () {
  const pathname = window.location.pathname;
  const pageGroup = pageGroups(pathname);
  if (pageGroup) {
    cwr("recordPageView", { pageId: pathname, pageTags: [pageGroup] });
  } else {
    cwr("recordPageView", { pageId: pathname });
  }
})();
