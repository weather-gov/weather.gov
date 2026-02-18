/**
 * Generic WCAG Tabs component
 * ------------------------------------------
 * Progressively enhanced tab interface that expects the
 * underlying markup to include proper `role`, `aria-selected`,
 * and `aria-controls` attributes on tab and panel elements.
 *
 * Keyboard navigation (ArrowLeft/Right, Home, End, Space,
 * Enter) is delegated to the shared tab-keyboard-nav utility
 * so the same logic doesn't get duplicated across components.
 *
 * See https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
import { attachTabKeyboardNav } from "./tab-keyboard-nav.js";

class Tabs extends HTMLElement {
  constructor(){
    super();

    // Keep a bound reference so we can cleanly remove it later
    this.handleTabClick = this.handleTabClick.bind(this);
  }

  connectedCallback(){
    // Wire up click handlers on every declared tab
    Array.from(this.querySelectorAll('[role="tab"]'))
      .forEach(tabElement => {
        tabElement.addEventListener("click", this.handleTabClick);
      });

    // Keyboard navigation comes from the shared utility —
    // it returns a teardown function we'll invoke on disconnect
    this._cleanupKeyNav = attachTabKeyboardNav(
      this,
      '[role="tab"]',
      { activateOnSpace: true, activateOnEnter: true },
    );
  }

  disconnectedCallback(){
    // Tear down keyboard navigation first
    if(this._cleanupKeyNav){
      this._cleanupKeyNav();
    }

    // Then remove click listeners from individual tabs
    Array.from(this.querySelectorAll('[role="tab"]'))
    .forEach(tabElement => {
      tabElement.removeEventListener("click", this.handleTabClick);
    });
  }

  /**
   * When a tab is clicked, flip the aria-selected flags across
   * the whole set and toggle the matching tabpanel's visibility
   * attribute. Actual show/hide styling is left to the
   * implementor's CSS.
   */
  handleTabClick(event){
    const tab = event.target.closest('[role="tab"]');
    const panelId = tab.getAttribute("aria-controls");
    const panel = document.getElementById(panelId);
    if(panel){
      // Deselect every tab, then mark the clicked one active
      this.tabs.forEach(tabElement => {
        tabElement.setAttribute("aria-selected", false);
      });
      tab.setAttribute("aria-selected", true);

      // Mirror the selection state on tabpanels
      this.tabpanels.forEach(tabpanelElement => {
        tabpanelElement.setAttribute("data-tabpanel-selected", false);
      });
      panel.setAttribute("data-tabpanel-selected", true);

      // Stash the active panel id on the component itself so
      // external code can read which tab is current
      this.setAttribute("data-selected", panelId);
    }
  }

  get tabs(){
    return Array.from(this.querySelectorAll('[role="tab"]'));
  }

  get tabpanels(){
    return this.tabs.map(tabElement => {
      const panelId = tabElement.getAttribute("aria-controls");
      return document.getElementById(panelId);
    });
  }
}

window.customElements.define("wx-tabs", Tabs);
