class TabbedNavigator extends HTMLElement {
  constructor() {
    super();

    // Bind this context to methods that need it
    this.handleAlertAnchorClick = this.handleAlertAnchorClick.bind(this);
    this.handleTabButtonClick = this.handleTabButtonClick.bind(this);
    this.switchToTab = this.switchToTab.bind(this);
    this.scrollToAccordion = this.scrollToAccordion.bind(this);
  }

  connectedCallback() {
    // If no tabs are selected by default, then select the first one
    const selected = Array.from(
      this.querySelectorAll(".tab-button[data-selected]"),
    );
    if (!selected.length) {
      this.switchToTab(this.querySelector("button").dataset.tabName);
    }

    // The initial page load might contain a hash fragment
    // referring either to content within a given tab
    // (such as an alert) or a tab itself. We should handle
    // these two cases.
    this.navigateWithInitialHash();

    // Intercept click events on Alert links at the
    // top of the page and handle them in this component
    Array.from(document.querySelectorAll("weathergov-alert-list a")).forEach(
      (alertAnchor) => {
        alertAnchor.addEventListener("click", this.handleAlertAnchorClick);
      },
    );

    // Intercept click events on Alert spans in
    // any hourly detail tables
    Array.from(this.querySelectorAll(".wx-alert-link a")).forEach(
      (alertSpan) => {
        alertSpan.addEventListener("click", this.handleAlertAnchorClick);
      }
    );

    // Add needed event listeners
    Array.from(this.querySelectorAll("button.tab-button")).forEach((button) => {
      button.addEventListener("click", this.handleTabButtonClick);
      button.addEventListener("keydown", this.handleTabListKeydown);
    });
  }

  disconnectedCallback() {
    // Remove any event listeners
    Array.from(this.querySelectorAll("button.tab-button")).forEach((button) => {
      button.removeEventListener("click", this.handleTabButtonClick);
      button.removeEventListener("keydown", this.handleTabListKeydown);
    });
  }

  navigateWithInitialHash() {
    const hash = new URL(window.location).hash;
    if (!hash || hash === "") {
      return;
    }

    try {
      const matchedTabButton = this.querySelector(
        `[data-tab-name="${hash.replace("#", "")}"]`,
      );
      if (matchedTabButton) {
        this.switchToTab(matchedTabButton.dataset.tabName);
        matchedTabButton.parentElement.scrollIntoView();
        return;
      }

      const childElement = this.querySelector(
        `${hash},wx-tab-container, .wx-tab-container ${hash}`,
      );
      if (childElement) {
        const tabContainer = childElement.closest(".wx-tab-container");
        this.switchToTab(tabContainer.id);
        if (childElement.matches(".usa-accordion")) {
          this.toggleAccordion(childElement, true);
          document.addEventListener("DOMContentLoaded", () => {
            this.scrollToAccordion(childElement);
          });
        }
      }
    } catch (e) {
      // Guard against hashes that are not valid DOM identifiers. We can't
      // prevent users from typing random stuff in the address bar, but we
      // prevent our scripts from crashing if they do.
    }
  }

  switchToTab(tabId) {
    // First, deactivate all tabs
    Array.from(this.querySelectorAll(".tab-button, .wx-tab-container")).forEach(
      (element) => {
        element.removeAttribute("data-selected");
        if (element.matches(".tab-button")) {
          element.setAttribute("aria-expanded", "false");
          element.setAttribute("tabindex", "-1");
        }
      },
    );

    // Active the tab button
    const tabButton = this.querySelector(`[data-tab-name="${tabId}"]`);
    tabButton.setAttribute("data-selected", "");
    tabButton.setAttribute("aria-expanded", "true");
    tabButton.removeAttribute("tabindex");

    // Activate the corresponding container
    const tabContainer = this.querySelector(`#${tabId}`);
    tabContainer.setAttribute("data-selected", "");

    // Trigger a custom event for use externally
    // when tabs switch
    const event = new CustomEvent("wx:tab-switched", {
      detail: {
        tabId,
      },
      bubbles: true,
    });
    this.dispatchEvent(event);
  }

  handleTabButtonClick(event) {
    this.switchToTab(event.target.dataset.tabName);
    // Since this was an actual click, update the hash
    // of the site to the tab button's id
    window.history.replaceState(null, null, `#${event.target.dataset.tabName}`);
  }

  handleAlertAnchorClick(event) {
    const hash = new URL(event.currentTarget.href).hash;
    const accordionEl = this.querySelector(`${hash}.usa-accordion`);

    if (accordionEl) {
      // If we get here, then the element referred
      // to by the href is a child of this tabbed
      // navigator.
      // We need to toggle to the correct tab pane
      // to properly display and scroll to the element.
      const tabContainer = accordionEl.closest(".wx-tab-container");
      this.switchToTab(tabContainer.id);
      this.toggleAccordion(accordionEl, true);

      // Because we use a sticky position on
      // the tab button area, the normal browser
      // scrolling will not display the proper position
      // to the user. Instead, we have to roll our
      // own scrolling method
      this.scrollToAccordion(accordionEl);
      event.preventDefault();
      window.history.replaceState(null, null, hash);
    } else {
      // If we're not looking at one of the tab container's inner accordions,
      // check if we're looking for a tab.
      const tabContainer = this.querySelector(`${hash}.wx-tab-container`);
      if (tabContainer) {
        // If we are, switch to that tab.
        this.switchToTab(tabContainer.id);
        event.preventDefault();
        this.scrollTo(0, 0);
        window.history.replaceState(null, null, hash);
      }
    }
  }

  toggleAccordion(accordionElement, on = true) {
    const button = accordionElement.querySelector(
      "button.usa-accordion__button",
    );
    const content = accordionElement.querySelector(".usa-accordion__content");

    if (on) {
      button.setAttribute("aria-expanded", "true");
      content.removeAttribute("hidden");
    } else {
      button.setAttribute("aria-expanded", "false");
      content.addAttribute("hidden", "");
    }
  }

  handleTabListKeydown(event) {
    // Per W3C guidelines, arrow keys and other navigation
    // keys should be used (instead of tab) to navigate the
    // focus of tab buttons.
    // See (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/examples/tabs-manual/)
    const currentElement = event.target;
    const isFirst = currentElement.matches(":first-child");
    const isLast = currentElement.matches(":last-child");
    if (event.key === "ArrowRight") {
      if (isLast) {
        event.target.parentElement
          .querySelector(".tab-button:first-child")
          .focus();
      } else {
        currentElement.nextElementSibling.focus();
      }
      event.preventDefault();
    } else if (event.key === "ArrowLeft") {
      if (isFirst) {
        event.target.parentElement
          .querySelector(".tab-button:last-child")
          .focus();
      } else {
        currentElement.previousElementSibling.focus();
      }
      event.preventDefault();
    } else if (event.key === "Home") {
      event.target.parentElement
        .querySelector(".tab-button:first-child")
        .focus();
      event.preventDefault();
    } else if (event.key === "End") {
      event.target.parentElement
        .querySelector(".tab-button:last-child")
        .focus();
      event.preventDefault();
    }
  }

  scrollToAccordion(accordionElement) {
    const accordionTop = accordionElement.getBoundingClientRect().top;
    const buttonArea = this.querySelector(".tab-buttons");
    const buttonAreaHeight = buttonArea.getBoundingClientRect().height;
    const scrollY = accordionTop + window.scrollY - buttonAreaHeight;
    window.scrollTo(0, scrollY);
  }
}

window.customElements.define("wx-tabbed-nav", TabbedNavigator);
