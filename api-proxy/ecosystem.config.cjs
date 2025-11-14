module.exports = {
  apps: [
    {
      name: "api-proxy",
      script: "main.js",
      ignore_watch: ["data", "node_modules", ".pm2"],
      watch: ["**/*.js"],
      node_args: "--inspect=0.0.0.0:9230",
    },
  ],
};
