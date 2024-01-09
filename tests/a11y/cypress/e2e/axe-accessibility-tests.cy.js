// eslint-disable-next-line import/extensions
const pages = require("../../../pages.json");

const viewports = [
  ["phone", 480, 500],
  ["tablet", 640, 500],
  ["desktop", 1024, 500],
];

describe("accessibility tests", () => {
  before(() => {
    cy.request("http://localhost:8081/local");
  });

  pages.forEach(({ name, url }) => {
    describe(name, () => {
      viewports.forEach(([viewport, width, height]) => {
        it(`${viewport} (width: ${width})`, () => {
          cy.visit(url);

          cy.get("html").invoke("css", "height", "initial");
          cy.get("body").invoke("css", "height", "initial");
          cy.viewport(width, height);

          cy.injectAxe();
          cy.configureAxe({ runOnly: { values: ["wcag2aa"] } });
          cy.checkA11y(null, null, (violations) => {
            for (const violation of violations) {
              for (const node of violation.nodes) {
                cy.task("a11yViolation", {
                  violation,
                  node,
                  url,
                  description: `${name} @ ${viewport}`,
                });
              }
            }
          });
        });
      });
    });
  });
});
