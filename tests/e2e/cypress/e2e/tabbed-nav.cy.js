/* eslint no-unused-expressions: off */
describe("<wx-tabbed-nav> component tests", () => {
  describe("Alert link interaction", () => {
    beforeEach(() => {
      cy.request("http://localhost:8081/play/testing");
      cy.visit("/point/34.749/-92.275");
    });

    describe("Basic tabbed nav tests", () => {
      let tabbedNav;
      it("Can find the tabbed-nav element on the page", () => {
        tabbedNav = cy.get("wx-tabbed-nav").then((element) => {
          tabbedNav = element;
          expect(tabbedNav).to.exist;
        });
      });

      it("Knows the tabbed-nav is a defined custom element", () => {
        cy.window().then((win) => {
          const customEl = win.customElements.get("wx-tabbed-nav");
          expect(customEl).to.exist;
          expect(tabbedNav.get(0).isConnected).to.be.true;
        });
      });

      it("There is a default tab selected and its content is visible", () => {
        cy.get('wx-tabbed-nav .tab-button[aria-expanded="true"]')
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
        cy.get(`wx-tabbed-nav .tab-button:not([data-selected])`)
          .as("unselectedBtn")
          .should("exist")
          .get("@unselectedBtn")
          .then((btn) => {
            const tabName = btn.attr("data-tab-name");
            cy.get(`#${tabName}`).should("exist").should("not.be.visible");
          });
      });

      it("Clicking an unselected tab should show it", () => {
        cy.get("wx-tabbed-nav .tab-button:last").as("lastBtn").click();
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
        cy.get("wx-tabbed-nav .tab-button:last").click();
        cy.get("wx-tabbed-nav .tab-button:not(:last)").each((btn) => {
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
          cy.wrap(anchorEl).click();
          cy.get(`#${alertId}`)
            .as("alertEl")
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
          .get('wx-tabbed-nav .tab-button:not([data-tab-name="alerts"]):first')
          .click();
        // Get the third alert link and click it
        cy.get("weathergov-alert-list a:last").click();
        // Get the alerts tab button and make sure it's now
        // selected
        cy.get('wx-tabbed-nav .tab-button[data-tab-name="alerts"]')
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

  describe("Initial page load with hash", () => {
    it("Navigates to the correct alert accordion and opens it if hash present", () => {
      const alertId = "alert_2";
      cy.visit(`/point/34.749/-92.275#${alertId}`);
      cy.get(`#${alertId}`)
        .as("alertEl")
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

    ["today", "daily"].forEach((tabName) => {
      it(`Acticates the ${tabName} tab if the hash for it is present`, () => {
        cy.visit(`/point/34.749/-92.275#${tabName}`);
        cy.get(`.tab-button[data-tab-name="${tabName}"]`)
          .as("tabButton")
          .invoke("attr", "data-selected")
          .should("exist")
          .get("@tabButton")
          .invoke("attr", "aria-expanded")
          .should("eq", "true")
          .get(`#${tabName}`)
          .should("be.visible")
          .invoke("attr", "data-selected")
          .should("exist");
      });
    });
  });

  describe("Conditional tabs", () => {
    it("Should not display an alerts tab or area if there are no alerts", () => {
      cy.visit("/point/35.198/-111.651");
      cy.get('.tab-button[data-tab-name="alerts"]').should("not.exist");
      cy.get("#alerts").should("not.exist");
    });
  });

  describe("a11y tablist/tabpanel guidelines tests", () => {
    beforeEach(() => {
      cy.visit("/point/34.749/-92.275");
    });

    it("puts focus on the corresponding tabpanel when tab is pushed from a focussed tab button", () => {
      cy.get('[role="tab"][data-selected]').as("selectedTab").focus();
      cy.get("@selectedTab").tab();

      cy.get(":focus")
        .should("have.class", "tab-container")
        .invoke("attr", "id")
        .should("equal", "alerts");
    });

    it("can navigate to the next (right) element when right arrow key is pressed", () => {
      cy.get('.tab-button[data-tab-name="alerts"]').as("selectedTab").focus();
      cy.get("@selectedTab").type("{rightArrow}");
      cy.get(".tab-button:focus")
        .should("have.class", "tab-button")
        .invoke("attr", "data-tab-name")
        .should("equal", "current");
    });

    it("If current tab is the first one, pressing left will cycle to the _last_ button in the list", () => {
      cy.get(".tab-button:first-child").as("selectedTab").focus();

      cy.get("@selectedTab").type("{leftArrow}");
      cy.get(".tab-button:focus").should("match", ":last-child");
    });

    it("If current tab is the last one, pressing right will cycle to the _first_ button in the list", () => {
      cy.get(".tab-button:last-child").as("selectedTab").focus();

      cy.get("@selectedTab").type("{rightArrow}");
      cy.get(".tab-button:focus").should("match", ":first-child");
    });

    it("Home key puts focus on the first tab button in the tablist", () => {
      cy.get(".tab-button:last-child").as("selectedTab").focus();

      cy.get("@selectedTab").type("{home}");
      cy.get(".tab-button:focus").should("match", ":first-child");
    });

    it("End key puts the focus on the last tab button in the tablist", () => {
      cy.get(".tab-button:nth-child(2)").as("selectedTab").focus();

      cy.get("@selectedTab").type("{end}");
      cy.get(".tab-button:focus").should("match", ":last-child");
    });
  });
});
