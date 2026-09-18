class TabbedNavigator extends HTMLElement {
  constructor() {
    super();

    // Bind this context to methods that need it
    this.handleAlertAnchorClick = this.handleAlertAnchorClick.bind(this);
    this.handleDescendantClick = this.handleDescendantClick.bind(this);
    this.handleTabButtonClick = this.handleTabButtonClick.bind(this);
    this.switchToTab = this.switchToTab.bind(this);
    this.scrollToAccordion = this.scrollToAccordion.bind(this);
    this.navigateAlertAnchor = this.navigateAlertAnchor.bind(this);
  }

  connectedCallback() {
    // If no tabs are selected by default, then select the first one
    const selected = Array.from(
      this.querySelectorAll(".tab-button[data-selected]"),
    );
    if (!selected.length) {
      this.switchToTab(this.querySelector("button").dataset.tabName);
    }

    // Intercept click events on Alert links at the
    // top of the page and handle them in this component
    Array.from(document.querySelectorAll("wx-point-alert-links a")).forEach(
      (alertAnchor) => {
        alertAnchor.addEventListener("click", this.handleAlertAnchorClick);
      },
    );

    // Intercept click events on Alert spans that are in tab
    // containers controlled by this component
    this.addEventListener("click", this.handleDescendantClick);

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
    window.history.replaceState(null, null, `${event.target.dataset.url}`);
  }

  /**
   * A catch-all listener for click events inside the navigator and any
   * of its constituent tab content panes.
   * We use this to filter out for wx-alert clicks, which will be handled
   * separately.
   */
  handleDescendantClick(event) {
    if (!event.target.matches("a")) {
      return;
    }
    const linkWrapper = event.target.closest(".wx-alert-link");
    if (!linkWrapper) {
      return;
    }
    this.navigateAlertAnchor(event.target);
  }

  navigateAlertAnchor(anchorEl) {
    const hash = new URL(anchorEl.href).hash;
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
      window.history.replaceState(null, null, hash);
    }
  }

  handleAlertAnchorClick(event) {
    event.prevendDefault();
    this.navigateAlertAnchor(event.currentTarget);
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

if (!window.customElements.get("wx-tabbed-nav")) {
  window.customElements.define("wx-tabbed-nav", TabbedNavigator);
}
