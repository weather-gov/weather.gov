/**
 * Undici Pool Configuration Options
 * ---------------------------------
 * We are using a subset of configurable undici Pool
 * configuration options, as specified by optional
 * environment variables.
 * This module exports a singleton of the configuration
 * that should be used, which is created from a base
 * default with the addition of any of the optional
 * environment variables.
 * See the undici docs for more detail on the config options:
 * https://undici.nodejs.org/#/docs/api/Client.md?id=parameter-clientoptions
 * https://undici.nodejs.org/#/docs/api/Pool?id=parameter-pooloptions
 */
const getNumberFromEnv = (variableName) => {
  const num = parseInt(process.env[variableName]);
  if(Number.isNaN(num)){
    return null;
  }
  return num;
};

const DEFAULT_SETTINGS = {
  // Attempt to use HTTP2 for connections
  allowH2: true,
  pipelining: 10,
  connections: 500,
};

/**
 * A dictionary mapping our ENV VAR names
 * to the names of the keys for a Pool configuration.
 * Descriptions of each configuration option are
 * commented inline.
 */
const ENV_VARS = {
  // The number of Client instances to create.
  // When set to null, the Pool instance will create
  // an unlimited amount of Client instances.
  "INTEROP_API_POOL_CONNECTIONS": "connections",

  // The amount of time before a Client instance is removed
  // from the Pool and closed.
  // When set to null, Client instances will not be
  // removed or closed based on age.
  "INTEROP_API_POOL_CLIENT_TTL": "clientTtl",

  // The timeout, in milliseconds, after which a socket without
  // active requests will time out.
  // Monitors time between activity on a connected socket.
  // This value may be overridden by keep-alive hints from the server.
  "INTEROP_API_POOL_KEEP_ALIVE_TIMEOUT": "keepAliveTimeout",

  // The timeout after which a request will time out, in milliseconds.
  // Monitors time between receiving body data.
  // Use 0 to disable it entirely. Defaults to 300 seconds.
  // Please note the timeout will be reset if you keep writing data to the socket everytime.
  "INTEROP_API_POOL_BODY_TIMEOUT": "bodyTimeout",

  // The amount of time, in milliseconds, the parser will wait to
  // receive the complete HTTP headers while not sending the request.
  // Defaults to 300 seconds.
  "INTEROP_API_POOL_HEADERS_TIMEOUT": "headersTimeout"
};

const POOL_SETTINGS = Object.keys(ENV_VARS)
// Only consider the variables that are actually
// set in the current environment
      .filter(envVarName => {
        return envVarName in process.env;
      })
// Map each parsed environment variable either to
// an object whose key is the undici config key name
// and value the parsed integer, or a null overall in
// cases where an integer could not be parsed out
      .map(envVarName => {
        const value = getNumberFromEnv(envVarName);
        if(value){
          const configKey = ENV_VARS[envVarName];
          return { [configKey]: value };
        }
        return null;
      })
// Filter out any of the results that were null
      .filter(configItem => {
        return !!configItem;
      })
// The reduction here starts with a copy of the
// default settings object, and adds the incoming
// key/val object for each configuration as it
// iterates. The result should be a full configuration
// object with the correct undici config keys and
// values set from the environment
      .reduce((configuration, configItem) => {
        return Object.assign({}, configuration, configItem);
      }, Object.assign({}, DEFAULT_SETTINGS));

export default POOL_SETTINGS;
