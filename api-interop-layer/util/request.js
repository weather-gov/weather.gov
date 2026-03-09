const STANDARD_HEADERS = {
  "User-Agent": "beta.weather.gov interop",
};

/**
 * A lightweight wrapper function to perform network requests.
 *
 * @param {undici.Client|undici.Pool} dispatcher - an undici instance that implements `Dispatcher.request`
 * @param {string} - the URL to request
 * @returns {object} The JSON response or throws an Error object for 4xx/5xx responses
 */
const performRequest = async (dispatcher, path) => {
  const response = await dispatcher.request({
    path,
    method: "GET",
    headers: {
      Accept: "application/json",
      ...STANDARD_HEADERS,
    },
  });

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
    if (!contentType.includes("json")) {
      await body.dump();
      const error = new Error(`Response was not JSON: ${contentType}`);
      error.error = true;
      throw error;
    }

    // Handle Empty or Valid Body
    const text = await body.text();
    const data = text && text.trim().length > 0 ? JSON.parse(text) : null;

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
export const requestJSON = async (dispatcher, path) => {
  const { data } = await performRequest(dispatcher, path);
  return data;
};

/**
 * Returns [data, headers]. Throws on error.
 */
export const requestJSONWithHeaders = async (dispatcher, path) => {
  const { data, headers } = await performRequest(dispatcher, path);
  return [data, headers];
};
