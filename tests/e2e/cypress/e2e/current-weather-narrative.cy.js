describe("the current weather narrative", () => {
  before(() => {
    cy.request("http://localhost:8081/local");
  });

  it("is full width", () => {
    // The narrative portion of the current conditions is meant to be the full
    // internal width of its parent. There was a bug where its sibling's width
    // was not set and as a result at certain viewport widths, the narrative
    // would jump into the same row as the sibling.
    //
    // This test is meant to capture that behavior and prevent regressions. If
    // the narrative is as wide as its parent, then it must be on its own line
    // and everything is hunky-dory.
    //
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
