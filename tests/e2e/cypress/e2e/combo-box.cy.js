/* eslint no-unused-expressions: off, cypress/no-unnecessary-waiting: off */

const WAIT_TIME = 2000;

describe.skip("wx-combo-box tests", () => {
  before(() => {
    // Stub the ArcGIS API requests to use
    // saved data
    cy.intercept(
      "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest*",
      { fixture: "arc.query.json" }
    ).as("arcSearch");
    cy.intercept(
      "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find*",
      { fixture: "arc.query.items.json" }
    ).as("arcSearchItems");

    // Go to landing page
    cy.visit("http://localhost:8080/");
  });
  it("Can find the combo-box element", () => {
    cy.get("wx-combo-box")
      .should("exist");
    cy.get("wx-combo-box > input").should("exist");
  });
  describe("When typing into the input", () => {
    beforeEach(() => {
      // Go to landing page
      // Stub the ArcGIS API requests to use
      // saved data
      cy.intercept(
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest*",
        { fixture: "arc.query.json" }
      ).as("arcSearch");
      cy.intercept(
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find*",
        { fixture: "arc.query.items.json" }
      ).as("arcSearchItems");

      // Go to landing page
      cy.visit("http://localhost:8080/");
      cy.wait(200);
      cy.get("wx-combo-box > input").as("componentInput").focus();
      cy.get("@componentInput").type("Arlin");
      cy.wait("@arcSearch");
    });

    it("it displays a visible dropdown list", () => {
      cy.get("wx-combo-box ul")
        .should("exist")
        .should("be.visible");
    });
    it("the first item in the dropdown is aria-selected", () => {
      cy.get("wx-combo-box ul").find('li:first-child[aria-selected="true"]').should("exist");
    });
    it("typing the down key pseudo-focuses the second element", () => {
      cy.get("wx-combo-box input").type("{downArrow}");
      cy.wait(WAIT_TIME);
      cy.get('wx-combo-box ul > li[aria-selected="true"]:nth-child(2)').should("exist");
    });
    it("typing the down arrow twice pseudo-focuses the third element", () => {
      cy.get("wx-combo-box input").as("input").type("{downArrow}{downArrow}");
      cy.wait(WAIT_TIME);
      cy.get('wx-combo-box ul > li[aria-selected="true"]:nth-child(3)').should("exist");
    });
    it("up arrow collapses the search list", () => {
      cy.get("wx-combo-box input").type("{upArrow}");
      cy.wait(WAIT_TIME);
      cy.get("wx-combo-box ul").should("not.be.visible");
    });
    it("pressing Enter selects an item, closing the list from view", () => {
      cy.get("wx-combo-box input").as("input").type("{downArrow}{downArrow}{enter}");
      cy.wait(WAIT_TIME);
      cy.get("wx-combo-box ul").should("not.be.visible");
    });
    it("pressing Enter selects the second item, but does not submit it", () => {
      cy.get("wx-combo-box input").type("{downArrow}{downArrow}{enter}{enter}");

      cy.location('pathname').should("eq", "/");
    });
    
    it("clicking selects the second item and navigates to the location page", () => {
      cy.intercept("*/point/*").as("pointNavigation");
      cy.wait(WAIT_TIME);
      cy.get("wx-combo-box ul > li:nth-child(3)").trigger("click");
      cy.wait("@pointNavigation");

      cy.location('pathname', {timeout: 6000}).should("contain", "/point/");
    });

    it("has a form whose action is updated correctly when an item is selected", () => {
      cy.get('wx-combo-box > input[slot="input"]')
        .type(
          "{downArrow}{downArrow}{enter}{enter}",
          {delay: 60}
        );
      cy.get('form[data-location-search]')
        .invoke("attr", "action")
        .should("eq", "/point/");
    });

    it("pressing enter twice performs the navigation on an item", () => {
      cy.intercept("*/point/*").as("pointNavigation");
      cy.get('wx-combo-box > input[slot="input"]')
        .type(
          "{downArrow}{downArrow}{enter}{enter}",
          {delay: 60}
        );

      cy.wait("@pointNavigation");
    });
  });
});
