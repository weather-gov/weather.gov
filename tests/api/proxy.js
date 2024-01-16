import fs from "fs/promises";
import https from "https";
import path from "path";

// For some reason, eslint is seeing prettier as a devDependency in the parent
// package.json, but not as a direct dependency of this one. It's causing a lint
// false-positive.
// eslint-disable-next-line import/no-extraneous-dependencies
import { format } from "prettier";

export default (req, res, { record = false, filePath = false } = {}) => {
  // Reassemble the query string, if any.
  const qs = Object.entries(req.query)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const proxy = https
    .request(
      {
        host: "api.weather.gov",
        port: 443,
        path: `${req.path}?${qs}`,
        method: "GET",
        headers: {
          "user-agent": "weather.gov dev proxy",
        },
      },
      (proxyResponse) => {
        const output = [];
        proxyResponse.setEncoding("utf-8");

        // First things first, pass along the status code and headers.
        res.writeHead(proxyResponse.statusCode, proxyResponse.headers);

        // Stream finish handler.
        const finish = async () => {
          // Write out the response.
          if (!res.writableEnded) {
            res.write(output.join(""));
          }
          res.end();

          // If we're supposed to record and we have a file path...
          if (record && !!filePath && proxyResponse.statusCode >= 200) {
            console.log(`record this to ${filePath}`);

            // Make the directory structure if necessary, then write out the
            // formatted JSON.
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            const json = await format(output.join(""), { parser: "json" });
            await fs.writeFile(filePath, json, {
              encoding: "utf-8",
            });
          }
        };

        proxyResponse.on("data", (chunk) => {
          output.push(chunk);
        });

        proxyResponse.on("close", finish);
        proxyResponse.on("end", finish);
      },
    )
    .on("error", (e) => {
      console.log(e.message);
      try {
        res.writeHead(500);
        res.write(e.message);
      } finally {
        res.end();
      }
    });
  proxy.end();
};
