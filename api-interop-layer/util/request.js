let STANDARD_HEADERS = {
  "User-Agent": "beta.weather.gov interop",
};

/**
 * A lightweight wrapper function to perform network requests.
 *
 * @param {undici.Client|undici.Pool} dispatcher - an undici instance that implements `Dispatcher.request`
 * @param {string} - the URL to request
 * @returns {object|Error} The JSON response or an Error object for 4xx/5xx responses
 */
export const requestJSON = async (dispatcher, path) => {
  const { statusText, statusCode, body } = await dispatcher.request({
    path,
    method: "GET",
    headers: {
      Accept: "application/json",
      ...STANDARD_HEADERS,
    },
  });
  if (statusCode >= 200 && statusCode < 400) {
    return body.json();
  }
  // we need to consume the response body even in the case of an error.
  await body.dump();
  // we have a 4xx or 5xx; it is the caller's responsibility to handle.
  const error = new Error();
  error.cause = { statusText, statusCode };
  error.error = true;
  return error;
};
