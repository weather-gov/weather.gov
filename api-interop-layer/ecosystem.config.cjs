module.exports = {
  apps: [{
    name: "api-interop-layer",
    script: "main.js",
    ignore_watch: ["newrelic_agent.log", "node_modules", ".pm2"],
    args: "--update-env",
    interpreter_args: "--experimental-loader newrelic/esm-loader.mjs -r newrelic",
    watch: ["**/*.js"]
  }]
}
