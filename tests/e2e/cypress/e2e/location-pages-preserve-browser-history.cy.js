describe("location search", () => {
  before(() => {
    cy.request("http://localhost:8081/no-local");
  });

  it("properly handles browser history", () => {
    const start = "/local/OHX/50/57";

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
