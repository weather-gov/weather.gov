describe("<tabbed-nav> component tests", () => {
  describe("Alert link interaction", () => {
    beforeEach(() => {
      cy.visit("/local/TST/10/10");
    });

    describe("Intercepts click events on above-the-fold alert links", () => {
      let tabbedNav;
      it("Can find the tabbed-nav element on the page", () => {
        tabbedNav = cy.get("tabbed-nav")
          .then(element => {
            tabbedNav = element;
            expect(tabbedNav).to.exist;
          });
      });

      it("Knows the tabbed-nav is a defined custom element", () => {
        cy.window()
          .then(win => {
            const customEl = win.customElements.get("tabbed-nav");
            expect(customEl).to.exist;
            expect(tabbedNav.get(0).isConnected).to.be.true;
          });
      });

      it("Clicking an alert link opens the accordion for that link ans scrolls to it", () => {
        cy
          .get("weathergov-alert-list a")
          .each(anchorEl => {
            const alertId = anchorEl.attr("href").split("#")[1];
            const alertEl = cy.get(`#${alertId}`).as("alertEl").click();
            cy
              .wait(20)
              .get("@alertEl").find(".usa-accordion__content")
              .invoke("attr", "hidden")
              .should("not.exist")
              .get("@alertEl")
              .find("button.usa-accordion__button")
              .invoke("attr", "aria-expanded")
              .should("eq", "true")
              .get("@alertEl")
              .should("be.visible"); 
          });
      });
    });
  });
});
