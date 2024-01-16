describe("the current weather narrative", () => {
  before(() => {
    cy.request("http://localhost:8081/local");
  });

  it("is on its own line", () => {
    cy.viewport(1020, 500);

    cy.visit("/local/TST/20/20");
    cy.get("html").invoke("css", "height", "initial");
    cy.get("body").invoke("css", "height", "initial");

    cy.get(".weather-gov-current-conditions weather-timestamp").then((node) => {
      node.text("Friday, 12:12 PM EDT");
    });

    cy.get(".weather-gov-current-conditions ").matchImageSnapshot();
  });
});
