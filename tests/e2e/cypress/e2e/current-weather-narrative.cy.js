describe("the current weather narrative", () => {
  before(() => {
    cy.request("http://localhost:8081/local");
  });

  it("is full width", () => {
    // https://github.com/weather-gov/weather.gov/issues/644
    cy.viewport(1020, 500);

    cy.visit("/local/TST/20/20");
    cy.get("html").invoke("css", "height", "initial");
    cy.get("body").invoke("css", "height", "initial");

    cy.get(".weather-gov-current-conditions")
      .invoke("innerWidth")
      .then((width) => {
        cy.get(
          ".weather-gov-current-conditions div[data-wx-current-conditions-narrative]",
        )
          .invoke("outerWidth")
          .should("equal", width);
      });
  });
});
