/* eslint no-unused-expressions: off */
describe("Alert display testing", () => {
  beforeEach(() => {
    cy.request("http://localhost:8081/play/testing");
    cy.visit("/point/34.749/-92.275");
  });

  it("The correct number of alerts show on the page", () => {
    cy.get("weathergov-alerts").find("div.usa-accordion").should("have.length", 7);
  });

  it("All alert accordions are open by default", () => {
    cy.get("weathergov-alerts > div.usa-accordion button")
      .invoke("attr", "aria-expanded")
      .should("equal", "true");
  });

  it("Clicking the alert accordion buttons closes them", () => {
    cy.get("weathergov-alerts > div.usa-accordion button").as("accordionButton")
      .click({multiple: true});
    cy.get("@accordionButton").invoke("attr", "aria-expanded").should("equal", "false");
  });
});
