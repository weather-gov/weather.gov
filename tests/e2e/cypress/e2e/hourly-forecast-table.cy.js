/* eslint no-unused-expressions: off */
describe("Hourly forecast table tests", () => {
  describe("Alert row spanning tests", () => {
    beforeEach(() => {
      cy.request("http://localhost:8081/play/testing");
      cy.visit("/point/34.749/-92.275");
    });

    it("Should have 2 alert rows on the hourly forecast", () => {
      cy.get(`#today hourly-table tr[data-row-name="alert"]`).should("have.length", 2);
    });

    it("There is a Red Flag alert of the correct displayed duration", () => {
      // We expect there to be a red-flag alert that spans two hours
      // and that contains the correct event label
      cy.contains(
        `#today hourly-table tr[data-row-name="alert"]:nth-child(2) td[colspan]:nth-child(2)`,
        "Red Flag Warning"
      )
        .invoke("attr", "colspan")
        .should("equal", "2");
    });

    it("Has a Special Weather Statement that begins in the third hour and spans 5 hours", () => {
      cy
        .contains(
          `#today hourly-table tr[data-row-name="alert"]:nth-child(3) td[colspan]`,
          "Special Weather Statement")
        .invoke("attr", "colspan")
        .should("equal", "5");
    });
  });
});
