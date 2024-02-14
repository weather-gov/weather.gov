describe("the location page", () => {
  before(() => {
    cy.request("http://localhost:8081/play/testing");
  });

  it("does not display marine laerts", () => {
    // The 0/0 alerts include a wind advisory and a small craft advisory. We
    // should only get the wind advisory.
    cy.visit("/local/TST/0/0/");
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
});
