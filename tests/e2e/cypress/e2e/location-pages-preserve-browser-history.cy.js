describe("location search", () => {
  before(() => {
    cy.request("http://localhost:8081/stop");
  });

  it("properly handles browser history", () => {
    const start = "/point/36.168/-86.778";

    cy.visit(start);
    // Clear out saved results for simplicity's sake
    cy.clearLocalStorage();

    cy.get(`form[data-location-search] input[type="text"]`).type("Atlanta", {
      delay: 200,
    });
    cy.get(`form[data-location-search] ul li[role="option"]`)
      .first()
      .trigger("click");

    cy.location("pathname").should("not.equal", start);

    cy.go("back");
    cy.location("pathname").should("equal", start);
  });
});
