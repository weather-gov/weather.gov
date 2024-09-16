import newrelic from "newrelic";

const NEW_RELIC_METRICS_URL = "https://metric-api.newrelic.com/metric/v1";

export const sendNewRelicMetrics = (metrics) => {
  const newRelicApiKey = process.env.NEWRELIC_LICENSE;
  if (!newRelicApiKey) {
    return {}; // nothing to do
  }

  const data = JSON.stringify([{ metrics }]);
  return fetch(NEW_RELIC_METRICS_URL, {
    method: "POST",
    headers: { "Api-Key": newRelicApiKey },
    data,
  }).then(async (r) => {
    if (r.status !== 202) {
      const response = await r.json();
      /* eslint-disable no-console */
      console.log(`NR error: ${response}`);
      /* eslint-enable no-console */
    }
    return {};
  });
};

const writeLog = (name, level, message) => {
  newrelic.recordLogEvent({ message, level, name });
  /* eslint-disable no-console */
  if (typeof message === "string") {
    console.log(`[${name}] | ${level} | ${message} |`);
  } else {
    console.log(`[${name}] | ${level} |`);
    console.log(message);
    console.log("|");
  }
  /* eslint-enable no-console */
};

const logLevels = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  verbose: 4,
};

const logLevel =
  logLevels[process.env.LOG_LEVEL?.toLowerCase()] ?? logLevels.info;

const noop = () => {};

export const createLogger = (name) => ({
  error:
    logLevel >= logLevels.error ? (msg) => writeLog(name, "error", msg) : noop,
  warn:
    logLevel >= logLevels.warn ? (msg) => writeLog(name, "warn", msg) : noop,
  info:
    logLevel >= logLevels.info ? (msg) => writeLog(name, "info", msg) : noop,
  verbose:
    logLevel >= logLevels.verbose
      ? (msg) => writeLog(name, "verbose", msg)
      : noop,
});

export default { createLogger };
