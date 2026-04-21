const STANDARD_HEADERS = {
  "User-Agent": "beta.weather.gov interop",
  Accept: "application/json",
};

/**
 * A lightweight wrapper function to perform network requests.
 *
 * @param {undici.Client|undici.Pool} dispatcher - an undici instance that implements `Dispatcher.request`
 * @param {string} - the URL to request
 * @returns {object} The JSON response or throws an Error object for 4xx/5xx responses
 */
const performRequest = async (dispatcher, path, additionalHeaders = {}) => {
  const composedHeaders = {
    ...STANDARD_HEADERS,
    ...additionalHeaders,
  };

  let response;
  try {
    response = await dispatcher.request({
      path,
      method: "GET",
      headers: composedHeaders,
      // Do not block, since we are pipelining.
      // See https://undici.nodejs.org/#/?id=pipelining
      blocking: false,
    });
  } catch (err) {
    // Catch undici timeout errors from the request itself
    if (
      err.code === "UND_ERR_BODY_TIMEOUT" ||
      err.code === "UND_ERR_HEADERS_TIMEOUT" ||
      err.code === "UND_ERR_CONNECT_TIMEOUT"
    ) {
      const timeoutError = new Error(`API took too long to respond: ${err.code}`);
      timeoutError.cause = {
        statusCode: 504,
        statusText: "Gateway Timeout",
      };
      timeoutError.error = true;
      throw timeoutError;
    }
    throw err;
  }

  const { statusCode, body, headers, statusText } = response;

  try {
    // Handle HTTP Errors (4xx/5xx)
    if (statusCode >= 400) {
      await body.dump(); // Release socket
      const error = new Error(`Request failed: ${statusCode}`);
      error.cause = { statusText, statusCode };
      error.error = true;
      throw error;
    }

    // Validate Content-Type (HTML/Non-JSON check)
    const contentType = headers["content-type"] || "";
    const askedForJson = composedHeaders["Accept"]?.includes("json");
    if (askedForJson && !contentType.includes("json")) {
      await body.dump();
      const error = new Error(`Response was not JSON: ${contentType}`);
      error.error = true;
      throw error;
    }

    // Handle Empty or Valid Body
    const text = await body.text();
    let data = text;
    if (askedForJson) {
      data = text && text.trim().length > 0 ? JSON.parse(text) : null;
    }

    return { data, headers };
  } catch (err) {
    // Safety cleanup for parsing errors
    if (body && !body.bodyUsed) {
      await body.dump().catch(() => {});
    }
    throw err;
  }
};

/**
 * Returns JSON data. Throws on error.
 */
export const requestJSON = async (dispatcher, path, additionalHeaders = {}) => {
  const { data } = await performRequest(dispatcher, path, additionalHeaders);
  return data;
};

/**
 * Returns [data, headers]. Throws on error.
 */
export const requestJSONWithHeaders = async (
  dispatcher,
  path,
  additionalHeaders = {},
) => {
  const { data, headers } = await performRequest(
    dispatcher,
    path,
    additionalHeaders,
  );
  return [data, headers];
};

/**
 * Wrapper for requests that are asking for plain text responses.
 * This is simply to differentiate from requestJSON which implicitly
 * has the expectation of dealing with JSON data.
 */
export const requestPlainText = async (
  dispatcher,
  path,
  additionalHeaders = {},
) => {
  return await performRequest(dispatcher, path, additionalHeaders);
};
