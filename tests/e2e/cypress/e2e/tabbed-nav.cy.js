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
          });
      });

      it("Intercepts the click handlers for alert links", () => {
        let handler;
        cy.log("hello");
        cy
          .get("tabbed-nav").then(element => {
            tabbedNav = element;
            expect(tabbedNav).to.exist;
            handler = cy.stub(tabbedNav.get(0), "handleAlertAnchorClick");
          })
          .get("weathergov-alert-list a")
          .click({multiple: true})
          .wait(200)
          .then(() => {
            expect(handler).to.be.called;
          });
      });
    });
  });
});
