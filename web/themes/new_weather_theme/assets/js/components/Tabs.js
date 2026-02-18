/**
 * Generic WCAG Tabs component
 * ------------------------------------------
 * A progressively enhanced custom element that expects
 * tab, tablist, and tabpanel elements to already carry
 * the correct `role` attributes and aria references in
 * the server-rendered markup.
 *
 * What this adds on top of the static HTML:
 * - Arrow key navigation with wraparound between tabs
 * - Home/End support to jump to first or last tab
 * - Space/Enter activation for the focused tab
 * - Proper tabindex roving so only the active tab
 *   sits in the keyboard Tab sequence
 * - Tabpanel focus management for seamless keyboard flow
 *
 * Reference:
 * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
class Tabs extends HTMLElement {
  constructor(){
    super();

    // Lock down `this` for methods used as event callbacks
    this.handleTabClick = this.handleTabClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  connectedCallback(){
    // Wire up click handling on every tab
    Array.from(this.querySelectorAll('[role="tab"]'))
      .forEach(tabElement => {
        tabElement.addEventListener("click", this.handleTabClick);
      });
    this.addEventListener("keydown", this.handleKeyDown);

    // Set up the roving tabindex right away. The WCAG tabs
    // pattern dictates that only the currently selected tab
    // should live in the natural Tab order — everything else
    // becomes reachable solely through arrow keys.
    this.initializeTabindexState();
  }

  disconnectedCallback(){
    this.removeEventListener("keydown", this.handleKeyDown);
    Array.from(this.querySelectorAll('[role="tab"]'))
    .forEach(tabElement => {
      tabElement.removeEventListener("click", this.handleTabClick);
    });
  }

  /**
   * Walks through every tab and panel to establish the
   * starting tabindex layout. The selected tab receives
   * tabindex="0" (reachable via Tab key), while the rest
   * get tabindex="-1" (arrow-key only).
   *
   * Panels follow the same logic — the visible one becomes
   * focusable so users can Tab straight from the active tab
   * into its content.
   */
  initializeTabindexState(){
    this.tabs.forEach(tabElement => {
      const isSelected = tabElement.getAttribute("aria-selected") === "true";
      tabElement.setAttribute("tabindex", isSelected ? "0" : "-1");
    });

    // Panels need the same treatment: the one on display
    // should accept focus, the hidden ones should not
    this.tabpanels.forEach(panelElement => {
      if(panelElement){
        const isActive = panelElement.getAttribute("data-tabpanel-selected") === "true";
        panelElement.setAttribute("tabindex", isActive ? "0" : "-1");
      }
    });
  }

  /**
   * Synchronizes the roving tabindex whenever a new tab is
   * chosen. Pulls every tab out of the Tab order first, then
   * puts just the newly selected one back in. Panels get the
   * same shuffle.
   */
  updateTabindexState(selectedTab, selectedPanel){
    // Yank all tabs out of the natural Tab sequence
    this.tabs.forEach(tabElement => {
      tabElement.setAttribute("tabindex", "-1");
    });
    // ...and restore just the one that was clicked/activated
    selectedTab.setAttribute("tabindex", "0");

    // Same idea for panels — hide the old, reveal the new
    this.tabpanels.forEach(panelElement => {
      if(panelElement){
        panelElement.setAttribute("tabindex", "-1");
      }
    });
    if(selectedPanel){
      selectedPanel.setAttribute("tabindex", "0");
    }
  }

  /**
   * Handles a click (or programmatic .click()) on a tab.
   * Flips aria-selected across all tabs, toggles the
   * data-tabpanel-selected attribute on the panels, and
   * refreshes the roving tabindex to match the new state.
   *
   * Actual show/hide of panel content is left to the
   * implementor's CSS — this component only manages state.
   */
  handleTabClick(event){
    const tab = event.target.closest('[role="tab"]');
    const panelId = tab.getAttribute("aria-controls");
    const panel = document.getElementById(panelId);
    if(panel){
      // Clear selection across every tab and panel
      this.tabs.forEach(tabElement => {
        tabElement.setAttribute("aria-selected", false);
      });
      tab.setAttribute("aria-selected", true);
      this.tabpanels.forEach(tabpanelElement => {
        tabpanelElement.setAttribute("data-tabpanel-selected", false);
      });
      panel.setAttribute("data-tabpanel-selected", true);
      this.setAttribute("data-selected", panelId);

      // Keep the roving tabindex in sync with the visual state
      this.updateTabindexState(tab, panel);
    }
  }

  /**
   * Keyboard handler following the WCAG manual activation
   * pattern. Arrow keys shift focus between tabs (wrapping
   * at the edges), Home/End jump to the extremes, and
   * Space or Enter fires the tab's click to activate it.
   */
  handleKeyDown(event){
    const currentFocus = this.querySelector('[role="tab"]:focus,[role="tab"]:focus-within');
    const firstItemInFocus = currentFocus.matches('[role="tab"]:first-child:focus, [role="tab"]:first-child:focus-within');
    const lastItemInFocus = currentFocus.matches('[role="tab"]:last-child:focus, [role="tab"]:last-child:focus-within');
    let handled = false;
    if(event.key === "ArrowLeft"){
      // Wrap around to the end if we're already on the first tab
      if(firstItemInFocus){
        this.focusTab(this.querySelector('[role="tab"]:last-child'));
      } else {
        this.focusTab(currentFocus.previousElementSibling);
      }
      handled = true;
    } else if(event.key === "ArrowRight"){
      // Wrap around to the start when past the last tab
      if(lastItemInFocus){
        this.focusTab(this.querySelector('[role="tab"]:first-child'));
      } else {
        this.focusTab(currentFocus.nextElementSibling);
      }
      handled = true;
    } else if(event.key === "Space" || event.key === "Enter"){
      // Trigger the tab just like a mouse click would
      currentFocus.click();
      handled = true;
    } else if(event.key === "Home") {
      this.focusTab(this.querySelector('[role="tab"]:first-child'));
      handled = true;
    } else if(event.key === "End"){
      this.focusTab(this.querySelector('[role="tab"]:last-child'));
      handled = true;
    }

    if(handled){
      event.stopPropagation();
      event.preventDefault();
    }
  }

  /**
   * Tries to move keyboard focus to the given element.
   * Not every element with role="tab" is inherently
   * focusable (it might be a <div>), so we also check
   * for a focusable child like a button or anchor.
   */
  focusTab(anElement){
    const matchString = "a, button, [tabindex]";
    if(anElement.matches(matchString)){
      anElement.focus();
    } else {
      const childFocusElement = anElement.querySelector(matchString);
      if(childFocusElement){
        childFocusElement.focus();
      }
    }
  }

  // Convenience getter — collects all tab elements inside this component
  get tabs(){
    return Array.from(this.querySelectorAll('[role="tab"]'));
  }

  // Resolves each tab's aria-controls to its corresponding panel element
  get tabpanels(){
    return this.tabs.map(tabElement => {
      const panelId = tabElement.getAttribute("aria-controls");
      return document.getElementById(panelId);
    });
  }
}

window.customElements.define("wx-tabs", Tabs);
