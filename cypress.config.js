const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    setupNodeEvents: (on) => {
      on("task", {
        a11yViolation: ({ violation, node }) => {
          // eslint-disable-next-line no-console
          console.log(
            `::error Accessibility error.::${violation.description} at ${node.html}`,
          );
          return null;
        },
      });
    },
  },
});
