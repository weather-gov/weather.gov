/* eslint no-unused-expressions: off */
describe("<tabbed-nav> component tests", () => {
  describe("Alert link interaction", () => {
    beforeEach(() => {
      cy.visit("/local/TST/10/10");
    });

    describe("Basic tabbed nav tests", () => {
      let tabbedNav;
      it("Can find the tabbed-nav element on the page", () => {
        tabbedNav = cy.get("tabbed-nav").then((element) => {
          tabbedNav = element;
          expect(tabbedNav).to.exist;
        });
      });

      it("Knows the tabbed-nav is a defined custom element", () => {
        cy.window().then((win) => {
          const customEl = win.customElements.get("tabbed-nav");
          expect(customEl).to.exist;
          expect(tabbedNav.get(0).isConnected).to.be.true;
        });
      });

      it("There is a default tab selected and its content is visible", () => {
        cy.get('tabbed-nav .tab-button[aria-expanded="true"]')
          .as("selectedButton")
          .should("exist")
          .get("@selectedButton")
          .invoke("attr", "data-selected")
          .should("exist")
          .get("@selectedButton")
          .then((btn) => {
            const tabName = btn.attr("data-tab-name");
            cy.get(`#${tabName}`).should("exist").should("be.visible");
          });
      });

      it("The content of un-selected tabs should not be visible", () => {
        cy.get(`tabbed-nav .tab-button:not([data-selected])`)
          .as("unselectedBtn")
          .should("exist")
          .get("@unselectedBtn")
          .then((btn) => {
            const tabName = btn.attr("data-tab-name");
            cy.get(`#${tabName}`).should("exist").should("not.be.visible");
          });
      });

      it("Clicking an unselected tab should show it", () => {
        cy.get("tabbed-nav .tab-button:last").as("lastBtn").click();
        cy.get("@lastBtn").then((btn) => {
          const tabName = btn.attr("data-tab-name");
          cy.get(`#${tabName}`)
            .should("be.visible")
            .invoke("attr", "data-selected")
            .should("exist");
        });
        cy.get("@lastBtn")
          .invoke("attr", "data-selected")
          .should("exist")
          .get("@lastBtn")
          .invoke("attr", "aria-expanded")
          .should("eq", "true");
      });

      it("Clicking an unselected tab hides the other tabs", () => {
        cy.get("tabbed-nav .tab-button:last").click();
        cy.get("tabbed-nav .tab-button:not(:last)").each((btn) => {
          const tabName = btn.attr("data-tab-name");
          cy.get(`#${tabName}`)
            .as("tabContent")
            .should("not.be.visible")
            .invoke("attr", "data-selected")
            .should("not.exist");
        });
      });
    });

    describe("Intercepts click events on above-the-fold alert links", () => {
      it("Clicking an alert link opens the accordion for that link and scrolls to it", () => {
        cy.get("weathergov-alert-list a").each((anchorEl) => {
          const alertId = anchorEl.attr("href").split("#")[1];
          cy.get(`#${alertId}`).as("alertEl").click();
          cy.get("@alertEl")
            .find(".usa-accordion__content")
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

      it("Opens the alerts tab (when not selected) when an alert link is clicked", () => {
        cy
          // Click on another tab that is not the alerts
          // tab button
          .get('tabbed-nav .tab-button:not([data-tab-name="alerts"]):first')
          .click();
        // Get the third alert link and click it
        cy.get("weathergov-alert-list a:last").click();
        // Get the alerts tab button and make sure it's now
        // selected
        cy.get('tabbed-nav .tab-button[data-tab-name="alerts"]')
          .as("alertsTabBtn")
          .invoke("attr", "aria-expanded")
          .should("eq", "true")
          .get("@alertsTabBtn")
          .invoke("attr", "data-selected")
          .should("exist")
          // Get the alerts tab content area and make sure
          // it is showing
          .get("#alerts")
          .should("be.visible")
          .invoke("attr", "data-selected")
          .should("exist");
      });
    });
  });
});
