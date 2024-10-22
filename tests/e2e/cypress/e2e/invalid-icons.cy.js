/* eslint no-unused-expressions: off */
describe("Invalid icon URL tests", () => {
  beforeEach(() => {
    cy.request("http://localhost:8081/play/testing");
    cy.visit("/point/38.886/-77.094");
  });

  it("Is able to render the current conditions", () => {
    cy.get("#today .usa-alert--error").should("not.exist");
  });

  it("Is able to render the hourly tab", () => {
    cy.get("#hourly .usa-alert--error").should("not.exist");
  });

  it("Is able to render the daily tab", () => {
    cy.get("#daily .usa-alert--error").should("not.exist");
  });

  it("Doesn't render icon for unknown icon name (current conditions)", () => {
    cy.get("#today .wx-icon").should("not.exist");
  });

  it("Doesn't render icon for first day condition in daily (unknown icon name)", () => {
    cy.get(
      "#daily .wx-daily-forecast-block ol li:first-child .wx-daily-forecast-summary-area:first-child",
    )
      .as("area")
      .should("exist");
    cy.get("@area").find("svg").should("not.exist");
  });

  it("Doesn't render icon for third night condition in daily (invalid icon url)", () => {
    cy.get(
      "#daily .wx-daily-forecast-block ol li:nth-child(3) .wx-daily-forecast-summary-area:nth-child(2)",
    )
      .as("area")
      .should("exist");
    cy.get("@area").find("svg").should("not.exist");
  });

  it("Doesn't render icon for second day condition in daily (icon value is null)", () => {
    cy.get(
      "#daily .wx-daily-forecast-block ol li:nth-child(2) .wx-daily-forecast-summary-area:first-child",
    )
      .as("area")
      .should("exist");
    cy.get("@area").find("svg").should("not.exist");
  });

  it("Does render icon for second night condition in daily", () => {
    cy.get(
      "#daily .wx-daily-forecast-block ol li:nth-child(2) .wx-daily-forecast-summary-area:nth-child(2)",
    )
      .as("area")
      .should("exist");
    cy.get("@area").find("svg").should("exist");
  });
});

describe("Valid icon rendering double-checks", () => {
  beforeEach(() => {
    cy.request("http://localhost:8081/play/testing");
    cy.visit("/point/34.749/-92.275");
  });

  it("Should render an icon in the current conditions", () => {
    cy.get("#today .wx-current-conditions .wx-icon > svg").should(
      "exist",
    );
  });
});
