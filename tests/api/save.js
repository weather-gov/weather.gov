import archiver from "archiver";
import { createWriteStream, promises as fs } from "fs";
import path from "path";
import { format } from "prettier";

let currentBundleId = false;
let endOfBundleTimer = false;

export default async (request, response, output, { bundle = false }) => {
  const requestId = request.headers["wx-gov-response-id"];

  // If we're supposed to capture a bundle and we haven't yet, this is the one
  // to capture. Save off the request ID.
  if (bundle) {
    if (bundle && currentBundleId === false) {
      console.log(`starting bundle ${requestId}`);
      currentBundleId = requestId;
    }

    // Stop bundling after 3 seconds of silence on this request ID.
    clearTimeout(endOfBundleTimer);
    endOfBundleTimer = setTimeout(() => {
      const bundlePath = `./data/bundle_${requestId}`;
      const outPath = `./data/bundle_${requestId}.zip`;

      const archive = archiver("zip");
      const outStream = createWriteStream(outPath);

      archive.directory(bundlePath, false).pipe(outStream);

      outStream.on("close", async () => {
        await fs.rm(bundlePath, { recursive: true });

        console.log(`bundle ${currentBundleId} finished`);
      });

      archive.finalize();
    }, 3_000);
  }

  // If we are bundling and this request ID is the same as our bundle ID, then
  // save it to the bundle folder. Otherwise put it in the normal place.
  const dataPath =
    bundle && currentBundleId === requestId
      ? `./data/bundle_${requestId}`
      : "./data";

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
    console.log(`record this to ${filePath}`);

    // Make the directory structure if necessary, then write out the
    // formatted JSON.
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const json = await format(output, { parser: "json" });
    await fs.writeFile(filePath, json, {
      encoding: "utf-8",
    });
  }
};
