describe("invalid location-based routes return 404", () => {
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
      ["with X starting with 0", "01", "1"],
      ["with Y starting with 0", "1", "01"],
    ].forEach(([test, x, y]) => {
      it(test, () => {
        cy.request({ url: `/local/abc/${x}/${y}`, failOnStatusCode: false })
          .its("status")
          .should("equal", 404);
        cy.visit(`/local/abc/${x}/${y}`, { failOnStatusCode: false });
      });
    });
  });
});
