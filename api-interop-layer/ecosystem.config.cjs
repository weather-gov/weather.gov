module.exports = {
  apps: [{
    name: "api-interop-layer",
    script: "main.js",
    ignore_watch: ["newrelic_agent.log"],
    args: "--update-env",
    interpreter_args: "--experimental-loader newrelic/esm-loader.mjs -r newrelic",
    watch: true
  }]
}
