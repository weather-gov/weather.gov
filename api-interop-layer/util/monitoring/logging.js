import { recordLogEvent } from "./newRelic.js";

const writeLog = (name, level, message) => {
  recordLogEvent({ message, level, name });
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
