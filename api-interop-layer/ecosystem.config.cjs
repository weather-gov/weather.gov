module.exports = {
  apps: [{
    name: "api-interop-layer",
    script: "main.js",
    ignore_watch: ["newrelic_agent.log"],
    args: "--update-env",
    interpreter_args: "--inspect=0.0.0.0:9229 --expose-gc --experimental-loader newrelic/esm-loader.mjs -r newrelic",
    watch: true
  }]
}
