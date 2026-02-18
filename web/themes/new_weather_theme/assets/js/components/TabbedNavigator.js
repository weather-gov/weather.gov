/**
 * Tabbed Navigator Component
 * ------------------------------------------
 * Manages the multi-tab layout on location pages, handling
 * tab switching, hash-based deep linking, accordion expansion,
 * and scroll offset compensation for the sticky button bar.
 *
 * Keyboard navigation (arrow keys, Home/End) is handled by
 * the shared tab-keyboard-nav utility rather than inline here.
 */
import { attachTabKeyboardNav } from "./tab-keyboard-nav.js";

class TabbedNavigator extends HTMLElement {
  constructor() {
    super();

    // Bind methods that rely on `this` context when called
    // as event callbacks
    this.handleAlertAnchorClick = this.handleAlertAnchorClick.bind(this);
    this.handleTabButtonClick = this.handleTabButtonClick.bind(this);
    this.switchToTab = this.switchToTab.bind(this);
    this.scrollToAccordion = this.scrollToAccordion.bind(this);
  }

  connectedCallback() {
    // When no tab has the selected attribute on load,
    // default to activating whichever button comes first
    const selected = Array.from(
      this.querySelectorAll(".tab-button[data-selected]"),
    );
    if (!selected.length) {
      this.switchToTab(this.querySelector("button").dataset.tabName);
    }

    // If the initial URL includes a hash fragment pointing to
    // a tab or content inside one, navigate there immediately
    this.navigateWithInitialHash();

    // Intercept click events on Alert links at the
    // top of the page and handle them in this component
    Array.from(document.querySelectorAll("weathergov-alert-list a")).forEach(
      (alertAnchor) => {
        alertAnchor.addEventListener("click", this.handleAlertAnchorClick);
      },
    );

    // Same treatment for alert links embedded in hourly
    // detail tables
    Array.from(this.querySelectorAll(".wx-alert-link a")).forEach(
      (alertSpan) => {
        alertSpan.addEventListener("click", this.handleAlertAnchorClick);
      }
    );

    // Attach click handlers to every tab button
    Array.from(this.querySelectorAll("button.tab-button")).forEach((button) => {
      button.addEventListener("click", this.handleTabButtonClick);
    });

    // Keyboard navigation is provided by the shared utility —
    // it gives back a cleanup function we store for disconnect
    this._cleanupKeyNav = attachTabKeyboardNav(this, ".tab-button");
  }

  disconnectedCallback() {
    // Tear down keyboard navigation
    if(this._cleanupKeyNav){
      this._cleanupKeyNav();
    }

    // Remove click listeners from the tab buttons
    Array.from(this.querySelectorAll("button.tab-button")).forEach((button) => {
      button.removeEventListener("click", this.handleTabButtonClick);
    });
  }

  /**
   * Checks the current URL hash on first load and, if it
   * points to a known tab or an element inside one, switches
   * to that tab (and opens its accordion if applicable).
   */
  navigateWithInitialHash() {
    const hash = new URL(window.location).hash;
    if (!hash || hash === "") {
      return;
    }

    try {
      // First check: is the hash the name of a tab itself?
      const matchedTabButton = this.querySelector(
        `[data-tab-name="${hash.replace("#", "")}"]`,
      );
      if (matchedTabButton) {
        this.switchToTab(matchedTabButton.dataset.tabName);
        matchedTabButton.parentElement.scrollIntoView();
        return;
      }

      // Second check: is the hash an element nested inside
      // one of the tab containers?
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
      // Guard against hashes that are not valid DOM identifiers.
      // Users can type arbitrary text into the address bar, and
      // we shouldn't let that crash our scripts.
    }
  }

  /**
   * Activates the tab identified by tabId while deactivating
   * all others. Also fires a custom event so external code
   * can react to the switch.
   */
  switchToTab(tabId) {
    // Start by clearing every tab and container
    Array.from(this.querySelectorAll(".tab-button, .wx-tab-container")).forEach(
      (element) => {
        element.removeAttribute("data-selected");
        if (element.matches(".tab-button")) {
          element.setAttribute("aria-expanded", "false");
          element.setAttribute("tabindex", "-1");
        }
      },
    );

    // Mark the target tab button as active
    const tabButton = this.querySelector(`[data-tab-name="${tabId}"]`);
    tabButton.setAttribute("data-selected", "");
    tabButton.setAttribute("aria-expanded", "true");
    tabButton.removeAttribute("tabindex");

    // Reveal the matching content container
    const tabContainer = this.querySelector(`#${tabId}`);
    tabContainer.setAttribute("data-selected", "");

    // Broadcast the switch so other components can respond
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
    // Persist the active tab in the URL hash so bookmarks
    // and browser history reflect the current state
    window.history.replaceState(null, null, `#${event.target.dataset.tabName}`);
  }

  /**
   * Intercepts clicks on alert anchor links and, when the
   * target lives inside one of our tab containers, switches
   * to that tab and scrolls the relevant accordion into view.
   */
  handleAlertAnchorClick(event) {
    const hash = new URL(event.currentTarget.href).hash;
    const accordionEl = this.querySelector(`${hash}.usa-accordion`);

    if (accordionEl) {
      // The linked element is an accordion inside a tab —
      // switch to its parent tab and expand it
      const tabContainer = accordionEl.closest(".wx-tab-container");
      this.switchToTab(tabContainer.id);
      this.toggleAccordion(accordionEl, true);

      // The sticky tab-button bar throws off native anchor
      // scrolling, so we compute the offset manually
      this.scrollToAccordion(accordionEl);
      event.preventDefault();
      window.history.replaceState(null, null, hash);
    } else {
      // Not an accordion — could still be a direct tab reference
      const tabContainer = this.querySelector(`${hash}.wx-tab-container`);
      if (tabContainer) {
        this.switchToTab(tabContainer.id);
        event.preventDefault();
        this.scrollTo(0, 0);
        window.history.replaceState(null, null, hash);
      }
    }
  }

  /**
   * Expands or collapses a USWDS accordion element by
   * toggling its button's aria-expanded and the content's
   * hidden attribute.
   */
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
      content.setAttribute("hidden", "");
    }
  }

  /**
   * Scrolls so that the given accordion is visible, accounting
   * for the height of the sticky tab-button bar that would
   * otherwise obscure the top of the content.
   */
  scrollToAccordion(accordionElement) {
    const accordionTop = accordionElement.getBoundingClientRect().top;
    const buttonArea = this.querySelector(".tab-buttons");
    const buttonAreaHeight = buttonArea.getBoundingClientRect().height;
    const scrollY = accordionTop + window.scrollY - buttonAreaHeight;
    window.scrollTo(0, scrollY);
  }
}

window.customElements.define("wx-tabbed-nav", TabbedNavigator);
