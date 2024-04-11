/* eslint no-unused-expressions: off */
describe("Hourly forecast table tests", () => {
  describe("Alert row spanning tests", () => {
    beforeEach(() => {
      cy.request("http://localhost:8081/play/testing");
      cy.visit("/point/34.749/-92.275");
    });

    it("Should have 2 alert rows on the hourly forecast", () => {
      cy.get(`#today wx-hourly-table tr[data-row-name="alert"]`).should("have.length", 2);
    });

    it("There is a Red Flag alert of the correct displayed duration", () => {
      // We expect there to be a red-flag alert that spans two hours
      // and that contains the correct event label
      cy.contains(
        `#today wx-hourly-table tr[data-row-name="alert"]:nth-child(2) td[colspan]:nth-child(2)`,
        "Red Flag Warning"
      )
        .invoke("attr", "colspan")
        .should("equal", "2");
    });

    it("Has a Special Weather Statement that begins in the third hour and spans 5 hours", () => {
      cy
        .contains(
          `#today wx-hourly-table tr[data-row-name="alert"]:nth-child(3) td[colspan]`,
          "Special Weather Statement")
        .invoke("attr", "colspan")
        .should("equal", "5");
    });
  });

  describe("Alert span clicking behavior", () => {
    beforeEach(() => {
      cy.request("http://localhost:8081/play/testing");
    });

    it("works when clicking an alert in the today tab's hourly table", () => {
      cy.visit("/point/34.749/-92.275#today");
      cy.get(
        `#today hourly-table tr[data-row-name="alert"]:nth-child(2) .hourly-table__alert`,
      ).click();

      cy.get("#alerts").should("be.visible");
      cy.get("#alerts button")
        .contains("Red Flag Warning")
        .invoke("attr", "aria-expanded")
        .should("equal", "true");
      cy.get("#a3").should("be.visible");
    });

    it("works when clicking an alert in one of the daily tab's hourly tables", () => {
      cy.visit("/point/34.749/-92.275#daily");
      cy.get("#daily ol li:first-child wx-hourly-toggle").click();
      cy.get(
        `#daily ol li:first-child hourly-table tr[data-row-name="alert"]:nth-child(2) .hourly-table__alert`,
      ).click();

      cy.get("#alerts").should("be.visible");
      cy.get("#alerts button")
        .contains("Red Flag Warning")
        .invoke("attr", "aria-expanded")
        .should("equal", "true");
      cy.get("#a3").should("be.visible");
    });
  });
});
