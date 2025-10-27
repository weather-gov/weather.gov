import https from "https";

export default (req, res) => {
  // Reassemble the query string, if any.
  const qs = Object.entries(req.query)
    .map(([key, value]) => `${key}=${value}`)
        .join("&");

  // Determine if this is a GHWO request.
  // If so, it needs to be proxied to the weathergov
  // website instead of the api
  const isGHWORequest = req.path.endsWith("hazByCounty.json");
  let proxyRequestSettings = {
    host: "api.weather.gov",
    port: 443,
    path: `${req.path}?${qs}`,
    method: "GET",
    headers: {
      "user-agent": "weather.gov dev proxy",
    },
  };
  if(isGHWORequest){
    proxyRequestSettings = {
      host: "www.weather.gov",
      port: 443,
      path: req.path,
      headers: {
        "user-agent": "weather.gov dev proxy"
      }
    };
  }

  const proxy = https
    .request(
      proxyRequestSettings,
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
            console.log("PROXY:    response finished");
          }
          res.end();
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
