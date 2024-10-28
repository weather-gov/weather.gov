import newrelic from "newrelic";

const NEW_RELIC_METRICS_URL = "https://metric-api.newrelic.com/metric/v1";
const [appName] = newrelic.agent?.config.app_name ?? [];
const licenseKey = newrelic.agent?.config.license_key;

let sendMetric = (metric) => {
  // augment metric attributes with our application name, since NR metrics does
  // not record where we are sending this metric from
  metric.attributes ??= {};
  metric.attributes.applicationName = appName;
  metric.timestamp ??= Date.now();

  const body = JSON.stringify([{ metrics: [metric] }]);
  return fetch(NEW_RELIC_METRICS_URL, {
    method: "POST",
    headers: { "Api-Key": licenseKey },
    body,
  }).then(async (r) => {
    const response = await r.json();
    if (r.status !== 202) {
      console.log(`NR error: ${response}`); // eslint-disable-line no-console
    }
    return response;
  });
};

let recordEvent = newrelic.recordLogEvent.bind(newrelic);

if (!licenseKey) {
  sendMetric = () => {};
  recordEvent = () => {};
}

export const sendNewRelicMetric = sendMetric;
export const recordLogEvent = recordEvent;
