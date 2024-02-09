import fs from "node:fs/promises";
import path from "node:path";
import { format } from "prettier";

export default async (request, response, output) => {
  const requestID = request.headers["wx-gov-response-id"];

  if (!requestID) {
    return;
  }

  // If we are bundling and this request ID is the same as our bundle ID, then
  // save it to the bundle folder. Otherwise put it in the normal place.
  const dataPath = `./data/bundle_${requestID}`;

  // Put the query string back together.
  const query = Object.entries(request.query)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  // The file path is the request path plus the query string, if any.
  const filePath = `${path.join(dataPath, request.path)}${
    query.length > 0 ? "__" : ""
  }${query}.json`;

  const contentType = response.headers["content-type"].replace(/\/geo\+/, "/");

  if (response.statusCode >= 200 && contentType === "application/json") {
    console.log(`SAVE:     saving response to ${filePath}`);

    // Make the directory structure if necessary, then write out the
    // formatted JSON.
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const json = await format(output, { parser: "json" });
    await fs.writeFile(filePath, json, {
      encoding: "utf-8",
    });
  }
};
