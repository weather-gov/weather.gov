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
    cy.visit("/point/34.749/-92.275");
    cy.get("weathergov-alert-list > div").should(
      "include.text",
      "Red Flag Warning",
    );
  });

  describe("shows n/a for unavailable data", () => {
    it("wind is null", () => {
      cy.visit("/point/33.211/-87.566");
      cy.get(".weather-gov-current-conditions .item").should(
        "include.text",
        "Wind N/A",
      );
      cy.get("[data-wx-current-conditions-narrative]").should(
        "include.text",
        "Wind information is unavailable.",
      );
    });
  });
});
