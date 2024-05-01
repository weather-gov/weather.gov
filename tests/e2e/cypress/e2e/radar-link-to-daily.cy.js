describe("screenreader-only link beside radar", () => {
  before(() => {
    cy.request("http://localhost:8081/play/testing");
  });

  it("opens the daily tab", () => {
    cy.visit("/point/33.521/-86.812#current");

    // Force the click. The element is hidden from view, so by default Cypress
    // won't click it. But that's the point and we still need to click it.
    cy.get("[wx-outer-radar-container] .usa-sr-only a").trigger("click", {
      force: true,
    });
    cy.get(`#daily`)
      .should("be.visible")
      .invoke("attr", "data-selected")
      .should("exist");
  });
});
