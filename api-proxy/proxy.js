import https from "https";

export default (req, res) => {
  const isStandalone = !!process.env.PROXY_STANDALONE;
  // if we are standalone then we should not be proxying and we should be
  // serving static files instead.
  if (isStandalone) {
    try {
      res.writeHead(500);
      res.write("error: proxy is in standalone mode");
    } finally {
      res.end();
    }
    return;
  }

  // Reassemble the query string, if any.
  const qs = Object.entries(req.query)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const proxyRequestSettings = {
    // If there's a wx-host header, use that as our hostname
    host: req.headers["wx-host"] ?? "api.weather.gov",
    port: 443,
    path: `${req.path}?${qs}`,
    method: "GET",
    headers: {
      "user-agent": "weather.gov dev proxy",
    },
  };

  const proxy = https
    .request(proxyRequestSettings, (proxyResponse) => {
      const output = [];
      proxyResponse.setEncoding("utf-8");

      // First things first, pass along the status code and headers.
      res.writeHead(proxyResponse.statusCode, proxyResponse.headers);

      // Stream finish handler.
      const finish = async () => {
        // Write out the response.
        if (!res.writableEnded) {
          res.write(output.join(""));
          console.log("PROXY:    response finished"); // eslint-disable-line no-console
        }
        res.end();
      };

      proxyResponse.on("data", (chunk) => {
        output.push(chunk);
      });

      proxyResponse.on("close", finish);
      proxyResponse.on("end", finish);
    })
    .on("error", (e) => {
      console.log(e.message); // eslint-disable-line no-console
      try {
        res.writeHead(500);
        res.write(e.message);
      } finally {
        res.end();
      }
    });
  proxy.end();
};
