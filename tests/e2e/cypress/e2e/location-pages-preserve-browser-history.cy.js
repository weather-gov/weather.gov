describe("location search", () => {
  before(() => {
    cy.request("http://localhost:8081/stop");
  });

  it.skip("properly handles browser history", () => {
    const start = "/point/36.168/-86.778";

    cy.visit(start);
    cy.get(`form[data-location-search] input[type="text"]`).type("Atlanta", {
      delay: 200,
    });
    cy.get("form[data-location-search] ul li").first().click();
    cy.location("pathname").should("not.equal", start);

    cy.go("back");
    cy.location("pathname").should("equal", start);
  });
});
