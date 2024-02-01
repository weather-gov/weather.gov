describe("the location page", () => {
  before(() => {
    cy.request("http://localhost:8081/local");
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

  it("expands the first alert accordion and collapses the rest", () => {
    // 10/10 has 6 alerts. That should be enough for us.
    cy.visit("/local/TST/10/10/");
    cy.get(
      "weathergov-alerts div.usa-accordion div.usa-accordion__content",
    ).each(($node, i) => {
      // The first alert node should not have the hidden attribute at all. The
      // rest should.
      const assertion = i === 0 ? "not.have.attr" : "have.attr";
      cy.wrap($node).should(assertion, "hidden");
    });
  });

  it("expands and collapses alerts", () => {
    // Per the above test, 0/0 should only have 1 alert.
    cy.visit("/local/TST/0/0");
    cy.get("weathergov-alerts div.usa-accordion");
  });
});
