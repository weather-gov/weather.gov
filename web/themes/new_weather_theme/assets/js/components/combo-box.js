const comboTemplate = `
<style>
 :host {
     position: relative;
     display: block;
     box-sizing: border-box;
 }
 :host([expanded="true"]) #listbox-wrapper {
     display: block;
     position: absolute;
     top: 100%;
     left: 0;
     min-width: 100%;
 }
 #listbox-wrapper,
 :host select {
     display: none;
 } 

 #sr-only {
     display: block;
     position: absolute;
     left: -1000%;
     height: 1px;
     width: 1px;
 }

 #input-area {
     display: flex;
     flex-direction: row;
     align-items: center;
     width: 100%;
 }
 
</style>
<div id="input-area">
  <slot name="input"></slot>
  <slot name="clear-button"></slot>
  <slot name="separator"></slot>
  <slot name="toggle-button"></slot>
</div>
<div id="listbox-wrapper">
  <slot name="listbox"></slot>
</div>
<div id="sr-only" aria-live="polite">
  <slot name="sr-only"></slot>
</div>
<slot></slot>
`;

/**
 * A note on terminology:
 * Due to how the WCAG recommendations discuss
 * listbox and combobox components, there can be some
 * confusion about what 'focus'means. So in this
 * component we will distinguish between actual
 * browser 'focus' in the traditional sense, and the
 * WCAG concept of 'focus', which is really a set of
 * attributes and styling for accessibility recommendations,
 * an corresponds to an item being 'currently selected'
 * (but not 'chosen') in our context.
 * We call this new type of focus pseudo-focus
 */

let count = 0;

class ComboBox extends HTMLElement {
  constructor() {
    super();
    count += 1;

    this.template = document.createElement("template");
    this.template.innerHTML = comboTemplate;
    this.attachShadow({ mode: "open", delegatesFocus: true });
    this.shadowRoot.append(this.template.content.cloneNode(true));
  }

  connectedCallback() {
    // Initial attributes
    this.classList.add("wx-combo-box");
    this.setAttribute("expanded", "false");

    // If we have not provided an id, set a default value
    if (!this.id) {
      this.id = `combo-box-${count}`;
    }

    // Initial live dom elements, if not already present
    this.initInput();
    this.initListbox();
    this.initClearButton();
    this.initToggleButton();
  }

  /**
   * Set the required attributes and classes on the
   * input element.
   * If there is no valid input element, create it
   */
  initInput() {
    let input = this.querySelector('input[slot="input"]');
    if (!input) {
      input = document.createElement("input");
    }
    input.setAttribute("type", "text");
    input.setAttribute("slot", "input");
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-label", "Location search input field");
    input.setAttribute("aria-owns", `${this.id}--list`);
    input.setAttribute("aria-controls", `${this.id}--list`);
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-autocomplete", "none");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-activedescendant", "");
    input.setAttribute("placeholder", "");
    input.id = `${this.id}--search-input`;
    input.classList.add("wx-combo-box__input");
    this.append(input);
    this.input = input;
  }

  initListbox() {
    let listbox = this.querySelector('[slot="listbox"]');
    if (!listbox) {
      listbox = document.createElement("div");
    }
    listbox.setAttribute("role", "listbox");
    listbox.setAttribute("slot", "listbox");
    listbox.id = `${this.id}--list`;
    listbox.classList.add("wx-combo-box__list--container");
    this.append(listbox);
    this.listbox = listbox;
  }

  initToggleButton() {
    let toggleButton = this.querySelector('[slot="toggle-button"]');
    if (!toggleButton) {
      toggleButton = document.createElement("button");
    }
    toggleButton.setAttribute("type", "button");
    toggleButton.setAttribute("aria-label", "Toggle the dropdown list");
    toggleButton.innerHTML = "&nbsp;";
    toggleButton.classList.add("wx-combo-box__toggle-list", "display-block");
    toggleButton.setAttribute("slot", "toggle-button");
    toggleButton.addEventListener("click", this.toggleList);
    toggleButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.toggleList();
        e.stopPropagation();
        e.preventDefault();
      }
    });
    this.append(toggleButton);
    this.toggleButton = toggleButton;
  }

  initClearButton() {
    let clearButton = this.querySelector('[slot="clear-button"]');
    if (!clearButton) {
      clearButton = document.createElement("button");
    }
    clearButton.setAttribute("type", "button");
    clearButton.setAttribute("tabindex", "-1");
    clearButton.setAttribute("slot", "clear-button");
    clearButton.classList.add("wx-combo-box__clear-input", "display-none");
    clearButton.innerHTML = "&nbsp;";
    clearButton.addEventListener("click", () => {
      this.clear();
    });
    this.append(clearButton);
    this.clearButton = clearButton;
  }
}

// window.customElements.define("wx-combo-box", ComboBox);
