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

    // Add needed event listeners
    Array.from(this.querySelectorAll("button.tab-button")).forEach((button) => {
      button.addEventListener("click", this.handleTabButtonClick);
    });
  }

  disconnectedCallback() {
    // Remove any event listeners
    Array.from(this.querySelectorAll("button.tab-button")).forEach((button) => {
      button.removeEventListener("click", this.handleTabButtonClick);
    });
  }

  navigateWithInitialHash() {
    const hash = new URL(window.location).hash;
    if (!hash || hash === "") {
      return;
    }

    const matchedTabButton = this.querySelector(
      `[data-tab-name="${hash.replace("#", "")}"]`,
    );
    if (matchedTabButton) {
      this.switchToTab(matchedTabButton.dataset.tabName);
      matchedTabButton.parentElement.scrollIntoView();
      return;
    }

    const childElement = this.querySelector(`${hash}`);
    if (childElement) {
      const tabContainer = childElement.closest(".tab-container");
      this.switchToTab(tabContainer.id);
      if (childElement.matches(".usa-accordion")) {
        this.toggleAccordion(childElement, true);
        document.addEventListener("DOMContentLoaded", () => {
          this.scrollToAccordion(childElement);
        });
      }
    }
  }

  switchToTab(tabId) {
    const activeElements = this.querySelectorAll("[data-selected]");
    Array.from(activeElements).forEach((activeElement) => {
      activeElement.removeAttribute("data-selected");
      if (activeElement.hasAttribute("aria-expanded")) {
        activeElement.setAttribute("aria-expanded", "false");
      }
    });
    const tabButton = this.querySelector(`[data-tab-name="${tabId}"]`);
    tabButton.setAttribute("data-selected", "");
    tabButton.setAttribute("aria-expanded", "true");
    const tabContainer = this.querySelector(`#${tabId}`);
    tabContainer.setAttribute("data-selected", "");
  }

  handleTabButtonClick(event) {
    this.switchToTab(event.target.dataset.tabName);
    // Since this was an actual click, update the hash
    // of the site to the tab button's id
    window.history.replaceState(null, null, `#${event.target.dataset.tabName}`);
  }

  handleAlertAnchorClick(event) {
    const hash = new URL(event.target.href).hash;
    const accordionEl = this.querySelector(`${hash}.usa-accordion`);
    if (accordionEl) {
      // If we get here, then the element referred
      // to by the href is a child of this tabbed
      // navigator.
      // We need to toggle to the correct tab pane
      // to properly display and scroll to the element.
      const tabContainer = accordionEl.closest(".tab-container");
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

  scrollToAccordion(accordionElement) {
    const accordionTop = accordionElement.getBoundingClientRect().top;
    const buttonArea = this.querySelector(".tab-buttons");
    const buttonAreaHeight = buttonArea.getBoundingClientRect().height;
    const scrollY = accordionTop + window.scrollY - buttonAreaHeight;
    window.scrollTo(0, scrollY);
  }
}

window.customElements.define("tabbed-nav", TabbedNavigator);
