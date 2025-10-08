module.exports = {
  apps: [
    {
      name: "api-proxy",
      script: "main.js",
      ignore_watch: ["data", "node_modules", ".pm2"],
      watch: ["**/*.js"],
    },
  ],
};
