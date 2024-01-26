const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:8080",
    screenshotOnRunFailure: false,
    setupNodeEvents: (on) => {
      on("task", {
        a11yViolation: ({ node, url, description }) => {
          const instances = [...node.any, ...node.all];
          if (instances.length) {
            for (const violation of instances) {
              console.log(
                `::error Accessibility error.::${violation.message} at ${node.html} (${description}: ${url}) [selector: ${node.target[0]}]`,
              );
            }
          } else {
            console.log(
              `::error Accessibility error.::${node.failureSummary.replace(/\n/g, " *")} at ${node.html} (${description}): ${url}) [selector: ${node.target[0]}]`,
            );
          }
          return null;
        },
      });
    },
  },
});
