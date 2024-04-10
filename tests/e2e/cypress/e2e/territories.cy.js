describe("territory places are supported", () => {
  before(() => {
    cy.request("http://localhost:8081/stop");
  });

  [
    ["/point/13.466/144.746", "Guam (GU)", "Agana Heights Village, GU"],
    ["/point/18.212/-66.051", "Puerto Rico (PR)", "Caguas, PR"],
    ["/point/15.199/145.777", "Northern Mariana Islands (MP)", "Saipan, MP"],
    ["/point/17.736/-64.748", "US Virgin Islands (VI)", "Saint Croix, VI"],

    // ----- We know the ones below this line don't work.
    // The API returns a WFO but no grid coordinates for AS.
    // ["/point/-14.273/-170.703", "American Samoa (AS)", "Pago Pago, AS"],

    // Our own database doesn't contain any places from the Minor Outlying
    // Islands. This is because there are no permanent residents or settlements
    // on any of these islands. We also know the API doesn't have any of them.
    // ["", "US Minor Outlying Islands (UM)", ""],
  ].forEach(([url, territory, place]) => {
    it(`supports ${territory}`, () => {
      cy.visit(url);
      cy.get("main h1").should("contain", place);

      cy.get("#today").should("not.contain", "error");
      cy.get("#daily").should("not.contain", "error");
    });
  });
});
