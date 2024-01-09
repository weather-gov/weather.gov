const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    screenshotOnRunFailure: false,
    setupNodeEvents: (on) => {
      on("task", {
        a11yViolation: ({ node, url, description }) => {
          const instances = [...node.any, ...node.all];
          for (const violation of instances) {
            // eslint-disable-next-line no-console
            console.log(
              `::error Accessibility error.::${violation.message} at ${node.html} (${description}: ${url}) [selector: ${node.target[0]}]`,
            );
          }
          return null;
        },
      });
    },
  },
});
