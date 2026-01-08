const config = {
  sessionSampleRate: 0.2,
  identityPoolId: "us-east-1:41d5720b-94ad-45e5-b216-4e8d6c8e28b8",
  endpoint: "https://dataplane.rum.us-east-1.amazonaws.com",
  telemetries: ["performance", "errors", "http"],
  allowCookies: true,
  enableXRay: false,
  signing: true, // If you have a public resource policy and wish to send unsigned requests please set this to false
};
const APPLICATION_ID = "ef7af089-12b8-4735-bf52-97230a845eb8";
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
