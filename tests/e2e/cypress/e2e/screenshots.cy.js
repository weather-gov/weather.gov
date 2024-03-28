// eslint-disable-next-line import/extensions
const pages = require("../../../pages.json");

const viewports = [
  ["phone", 480, 500],
  ["tablet", 640, 500],
  ["desktop", 1024, 500],
];

describe("collect screenshots", () => {
  before(() => {
    cy.request("http://localhost:8081/play/testing");
    // We don't care about any client errors for this, so just roll.
    cy.on("uncaught:exception", () => {});
  });

  it("is not a test, is just a utility", () => {
    for (const { name, url } of pages) {
      cy.visit(url);
      cy.get("html").invoke("css", "height", "initial");
      cy.get("body").invoke("css", "height", "initial");

      viewports.forEach(([viewport, width, height]) => {
        cy.viewport(width, height);
        cy.screenshot(`${viewport}/${name}`, { capture: "fullPage" });
      });
    }
  });
});
