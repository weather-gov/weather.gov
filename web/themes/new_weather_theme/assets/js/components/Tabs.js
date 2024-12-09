/**
 * Generic WCAG Tabs component
 * ------------------------------------------
 * This is a progressively enhanced component.
 * tab, tablist, and tabpanel elements are expected
 * to have the correct `role` attributes and other
 * aria references.
 * See
 * https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
class Tabs extends HTMLElement {
  constructor(){
    super();

    // Bound methods
    this.handleTabClick = this.handleTabClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  connectedCallback(){
    Array.from(this.querySelectorAll('[role="tab"]'))
      .forEach(tabElement => {
        tabElement.addEventListener("click", this.handleTabClick);
      });
    this.addEventListener("keydown", this.handleKeyDown);
  }

  disconnectedCallback(){
    this.removeEventListener("keydown", this.handleKeyDown);
    Array.from(this.querySelectorAll('[role="tab"]'))
    .forEach(tabElement => {
      tabElement.removeEventListener("click", this.handleTabClick);
    });
  }

  /**
   * The click handler should update the tab's
   * aria-selected attribute, and also update the
   * data-tabpanel-selected attribute on its corresponding
   * tabpanel.
   * Any hiding/showing of tabpanel content should be
   * handled by implementor's CSS
   */
  handleTabClick(event){
    const tab = event.target.closest('[role="tab"]');
    const panelId = tab.getAttribute("aria-controls");
    const panel = document.getElementById(panelId);
    if(panel){
      this.tabs.forEach(tabElement => {
        tabElement.setAttribute("aria-selected", false);
      });
      tab.setAttribute("aria-selected", true);
      this.tabpanels.forEach(tabpanelElement => {
        tabpanelElement.setAttribute("data-tabpanel-selected", false);
      });
      panel.setAttribute("data-tabpanel-selected", true);
      this.setAttribute("data-selected", panelId);
    }
  }

  /**
   * Binds key handling events as specified in
   * the WCAG recommendations
   */
  handleKeyDown(event){
    const currentFocus = this.querySelector('[role="tab"]:focus,[role="tab"]:focus-within');
    const firstItemInFocus = currentFocus.matches('[role="tab"]:first-child:focus, [role="tab"]:first-child:focus-within');
    const lastItemInFocus = currentFocus.matches('[role="tab"]:last-child:focus, [role="tab"]:last-child:focus-within');
    let handled = false;
    if(event.key === "ArrowLeft"){
      if(firstItemInFocus){
        this.focusTab(this.querySelector('[role="tab"]:last-child'));
      } else {
        this.focusTab(currentFocus.previousElementSibling);
      }
      handled = true;
    } else if(event.key === "ArrowRight"){
      if(lastItemInFocus){
        this.focusTab(this.querySelector('[role="tab"]:first-child'));
      } else {
        this.focusTab(currentFocus.nextElementSibling);
      }
      handled = true;
    } else if(event.key === "Space" || event.key === "Enter"){
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

  focusTab(anElement){
    // It is not required that the element with the role tab
    // be a focusable element. In such cases, we need to
    // check its children for elements that can receive focus.
    // We do this in the simplest possible way, limiting ourselves
    // to a, button, or any element with a tabindex
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
