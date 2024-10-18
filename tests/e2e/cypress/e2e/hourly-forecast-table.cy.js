/* eslint no-unused-expressions: off */
describe("Hourly forecast table tests", () => {
  describe("Alert row spanning tests", () => {
    beforeEach(() => {
      cy.request("http://localhost:8081/play/testing");
      cy.visit("/point/34.749/-92.275");
    });

    it("Should have 2 alert rows on the hourly forecast", () => {
      cy.get(
        `#daily ol li:first-of-type wx-hourly-table tr[data-row-name="alert"]`,
      ).should("have.length", 2);
    });

    it("There is a Red Flag alert of the correct displayed duration", () => {
      // We expect there to be a red-flag alert that spans two hours
      // and that contains the correct event label
      cy.contains(
        `#daily ol li:first-of-type wx-hourly-table tr[data-row-name="alert"]:nth-child(2) td[colspan]:nth-child(2)`,
        "Red Flag Warning",
      )
        .invoke("attr", "colspan")
        .should("equal", "2");
    });

    it("Has a Special Weather Statement that begins in the third hour and spans 5 hours", () => {
      cy.contains(
        `#daily ol li:first-of-type wx-hourly-table tr[data-row-name="alert"]:nth-child(3) td[colspan]:nth-child(3)`,
        "Special Weather Statement",
      )
        .invoke("attr", "colspan")
        .should("equal", "5");
    });

    it("has a blizzard warning starting tomorrow", () => {
      cy.contains(
        `#daily ol li:nth-of-type(2) wx-hourly-table tr[data-row-name="alert"]:nth-child(2) td[colspan]:nth-child(3)`,
        "Blizzard Warning",
      );
    });
  });

  describe("Alert span clicking behavior", () => {
    beforeEach(() => {
      cy.request("http://localhost:8081/play/testing");
    });

    it("works when clicking an alert in one of the daily tab's hourly tables", () => {
      cy.visit("/point/34.749/-92.275#daily");
      cy.get("#daily ol li:first-child wx-hourly-toggle").click();
      cy.get(
        `#daily ol li:first-child wx-hourly-table tr[data-row-name="alert"]:nth-child(2) .wx-alert-link`,
      ).click();

      cy.get("#alerts").should("be.visible");
      cy.get("#alerts button")
        .contains("Red Flag Warning")
        .invoke("attr", "aria-expanded")
        .should("equal", "true");
      cy.get("#alert_82d03a893a84390fbc5217471cd259eaa41a4135_001_1").should(
        "be.visible",
      );
    });
  });

  describe("Hourly precipitation tables", () => {
    it("Renders tables for every day", () => {
      cy.visit("/point/34.749/-92.275#daily");
      cy.get("#daily ol li table.wx-precip-table").should("exist");
    });
  });
});
