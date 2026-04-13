module.exports = {
  apps: [{
    name: "api-interop-layer",
    script: "main.js",
    instances: process.env.API_NODE_APPS || "2",
    exec_mode: "cluster",
    ignore_watch: ["newrelic_agent.log", "node_modules", ".pm2"],
    args: "--update-env",
    interpreter_args: "--experimental-loader newrelic/esm-loader.mjs -r newrelic",
    watch: ["**/*.js"],
    API_INTEROP_PRODUCTION: true
  }]
}
