describe("front page", () => {
  it("passes automated accessibility checks", () => {
    cy.visit("/", {});
    cy.injectAxe();
    cy.checkA11y(null, null, (violations) => {
      for (const violation of violations) {
        for (const node of violation.nodes) {
          cy.task("a11yViolation", { violation, node });
        }
      }
    });
  });
});
