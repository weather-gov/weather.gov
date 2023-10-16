const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    screenshotOnRunFailure: false,
    setupNodeEvents: (on) => {
      on("task", {
        a11yViolation: ({ node }) => {
          // eslint-disable-next-line no-console
          console.log(
            `::error Accessibility error.::${node.any[0].message} at ${node.html}`,
          );
          return null;
        },
      });
    },
  },
});
