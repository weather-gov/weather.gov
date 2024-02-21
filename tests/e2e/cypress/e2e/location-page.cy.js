describe("the location page", () => {
  before(() => {
    cy.request("http://localhost:8081/play/testing");
  });

  it("does not display marine laerts", () => {
    // This point include a wind advisory and a small craft advisory. We
    // should only get the wind advisory.
    cy.visit("/point/33.521/-86.812");
    cy.get("weathergov-alert-list > div").should("have.length", 1);
    cy.get("weathergov-alert-list > div").should(
      "include.text",
      "Wind Advisory",
    );
    cy.get("weathergov-alert-list > div").should(
      "not.include.text",
      "Small Craft Advisory",
    );

    cy.get("weathergov-alerts > div").should("have.length", 1);
    cy.get("weathergov-alerts > div").should("include.text", "Wind Advisory");
    cy.get("weathergov-alerts > div").should(
      "not.include.text",
      "Small Craft Advisory",
    );
  });

  it("does include alerts based on fire zone", () => {
    cy.visit("/local/TST/10/10/");
    cy.get("weathergov-alert-list > div").should(
      "include.text",
      "Red Flag Warning",
    );
  });
});
