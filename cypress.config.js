const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    screenshotOnRunFailure: false,
    setupNodeEvents: (on) => {
      on("task", {
        a11yViolation: ({ node }) => {
          if (process.env.CI === "true") {
            // eslint-disable-next-line no-console
            console.log(
              `::error Accessibility error.::${node.any[0].message} at ${node.html}`,
            );
          } else {
            // eslint-disable-next-line no-console
            console.log(node);
          }
          return null;
        },
      });
    },
  },
});
