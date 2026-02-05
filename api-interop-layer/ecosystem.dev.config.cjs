module.exports = {
  apps: [{
    name: "api-interop-layer",
    script: "src/main.ts",
    interpreter: "node",
    ignore_watch: ["newrelic_agent.log", "node_modules", ".pm2"],
    args: "--update-env",
    args: "--update-env",
    watch: ["**/*.js"],
    node_args: "--inspect=0.0.0.0:9229 --expose-gc --loader=ts-node/esm",
    env: {
      TS_NODE_TRANSPILE_ONLY: "true"
    }
  }]
}
