describe("page routing", () => {
  before(() => {
    cy.request("http://localhost:8081/play/testing");
  });

  it("loads point pages correctly", () => {
    cy.visit("/point/33.5224/-86.8288");
  });

  it("redirects from a WFO grid to a point page", () => {
    cy.visit("/local/BMX/59/84");
    cy.location("pathname").should("eq", "/point/33.5224/-86.8288");
  });

  describe("returns 404 errors", () => {
    it("if the point is not in any WFO grids", () => {
      cy.request({ url: "/point/23.3285/-19.3424", failOnStatusCode: false })
        .its("status")
        .should("equal", 404);
    });

    describe("for non-numeric points", () => {
      [
        ["with non-numeric latitude", "abc", "123"],
        ["with non-numeric longitude", "123", "abc"],
      ].forEach(([test, lat, lon]) => {
        it(test, () => {
          cy.request({ url: `/point/${lat}/${lon}`, failOnStatusCode: false })
            .its("status")
            .should("equal", 404);
          cy.visit(`/point/${lat}/${lon}`, { failOnStatusCode: false });
        });
      });
    });

    describe("with invalid WFO", () => {
      [
        ["with too-short WFO", "ab"],
        ["with too-long WFO", "abcd"],
        ["with WFO with numbers", "a1b"],
        ["with WFO that does not exist", "ZZZ"],
      ].forEach(([test, wfo]) => {
        it(test, () => {
          cy.request({ url: `/local/${wfo}/1/1`, failOnStatusCode: false })
            .its("status")
            .should("equal", 404);
          cy.visit(`/local/${wfo}/1/1`, { failOnStatusCode: false });
        });
      });
    });

    describe("with non-numeric grid coordinates", () => {
      [
        ["with non-numeric X", "a", "1"],
        ["with non-numeric Y", "1", "a"],
      ].forEach(([test, x, y]) => {
        it(test, () => {
          cy.request({ url: `/local/TST/${x}/${y}`, failOnStatusCode: false })
            .its("status")
            .should("equal", 404);
          cy.visit(`/local/TST/${x}/${y}`, { failOnStatusCode: false });
        });
      });
    });
  });
});
