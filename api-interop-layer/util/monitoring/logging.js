import { inProduction, recordLogEvent } from "./newRelic.js";

const writeProductionLog = (name, level, message, err) => {
  const log =
    err == null ? { name, level, message } : { name, level, message, err };
  recordLogEvent(log);
  console.log(JSON.stringify(log));
};

const writeDebugLog = (name, level, message, err) => {
  const msg = typeof message == "string" ? message : JSON.stringify(message);
  console.log(`[${name}] | ${level} | ${msg} |`);
  if (err) {
    // print out the error string, message, and/or stacktrace in red.
    if (Object.hasOwn(err, "message")) {
      console.log(`[${name}] | Error: \x1b[31m${err.message}\x1b[0m`);
      console.log(`[${name}] | Stack: \x1b[31m${err.stack}\x1b[0m`);
    } else {
      console.log(`[${name}] | \x1b[31m${err}\x1b[0m`);
    }
  }
};

const writeLog = (name, level, message, error) => {
  // an error class has no enumerable properties so it prints out as an empty
  // string. so we create an object if we have an error on our hands.
  const err =
    error instanceof Error
      ? {
          message: error.message,
          stack: error.stack, // nonstandard property, but it's in V8 and on standards track
        }
      : error;
  // if new relic is enabled, assume we are in production. if so, emit only JSON
  // logs. otherwise, print to console.
  if (inProduction) {
    writeProductionLog(name, level, message, err);
  } else {
    writeDebugLog(name, level, message, err);
  }
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
    logLevel >= logLevels.error
      ? (msg, error = null) => writeLog(name, "error", msg, error)
      : noop,
  warn:
    logLevel >= logLevels.warn
      ? (msg) => writeLog(name, "warn", msg, null)
      : noop,
  info:
    logLevel >= logLevels.info
      ? (msg) => writeLog(name, "info", msg, null)
      : noop,
  verbose:
    logLevel >= logLevels.verbose
      ? (msg) => writeLog(name, "verbose", msg, null)
      : noop,
});

export default { createLogger };
