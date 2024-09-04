// #region Template
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
// #endregion

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

class ComboBox extends HTMLElement {
  static count = 0;

  constructor() {
    super();
    ComboBox.count += 1;

    this.template = document.createElement("template");
    this.template.innerHTML = comboTemplate;
    this.attachShadow({ mode: "open", delegatesFocus: true });
    this.shadowRoot.append(this.template.content.cloneNode(true));

    // Private property defaults
    this.selectedIndex = -1;
    this.value = null;

    // Bind component methods
    this.handleInput = this.handleInput.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTextInput = this.handleTextInput.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.showList = this.showList.bind(this);
    this.hideList = this.hideList.bind(this);
    this.toggleList = this.toggleList.bind(this);
    this.navigateDown = this.navigateDown.bind(this);
    this.navigateUp = this.navigateUp.bind(this);
    this.pseudoFocusListItem = this.pseudoFocusListItem.bind(this);
    this.pseudoBlurItems = this.pseudoBlurItems.bind(this);
    this.chooseOption = this.chooseOption.bind(this);
    this.submit = this.submit.bind(this);
    this.clear = this.clear.bind(this);
    this.initInput = this.initInput.bind(this);
    this.initListbox = this.initListbox.bind(this);
    this.initToggleButton = this.initToggleButton.bind(this);
    this.initClearButton = this.initClearButton.bind(this);
    this.setListItems = this.setListItems.bind(this);
    this.getItemByValue = this.getItemByValue.bind(this);
    this.filterItems = this.filterItems.bind(this);
  }

  // #region Component lifecycle
  connectedCallback() {
    // Initial attributes
    this.classList.add("wx-combo-box");
    this.setAttribute("expanded", "false");

    // If we have not provided an id, set a default value
    if (!this.id) {
      this.id = `combo-box-${ComboBox.count}`;
    }

    // Initial live dom elements, if not already present
    this.initInput();
    this.initListbox();
    this.initClearButton();
    this.initToggleButton();

    // Bind event listeners
    this.addEventListener("input", this.handleInput);
    this.addEventListener("keydown", this.handleKeyDown);
    this.addEventListener("change", this.handleTextInput);
    this.input.addEventListener("focus", this.handleFocus);
    this.addEventListener("blur", this.hideList);
    this.input.addEventListener("blur", this.hideList);

    const items = JSON.parse(this.getAttribute("items") ?? "null");
    if (Array.isArray(items) && items.length > 0) {
      this.listItems = items;
      this.setListItems(items);

      const selected = this.getAttribute("selected");
      if (selected) {
        const li = this.getItemByValue(selected);
        if (li) {
          this.input.value = li.innerText;
          if (this.namedInput) {
            this.namedInput.value = li.dataset.value;
          }

          this.pseudoFocusListItem(li);
          this.handleTextInput();
        }
      }
    }
  }

  disconnectedCallback() {
    this.removeEventListener("input", this.handleInput);
    this.removeEventListener("keydown", this.handleKeyDown);
    this.removeEventListener("change", this.handleTextInput);
    this.input.removeEventListener("focus", this.handleFocus);
    this.removeEventListener("blur", this.hideList);
    this.input.removeEventListener("blur", this.hideList);
  }
  // #endregion

  // #region Component initialization
  /**
   * Set the required attributes and classes on the
   * input element.
   * If there is no valid input element, create it
   */
  initInput() {
    const input =
      this.querySelector('input[slot="input"]') ??
      document.createElement("input");

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

    // This named input element is provided so the value of the combo box is
    // presented to the containing form just like any other input. We hide it,
    // we inherit its name from the component, and we programmatically set its
    // value as the combo box state changes. Then this component works basically
    // like a real input element.
    if (this.getAttribute("name")) {
      const namedInput = document.createElement("input");
      namedInput.setAttribute("name", this.getAttribute("name"));
      namedInput.setAttribute("value", this.getAttribute("selected"));
      namedInput.setAttribute("type", "hidden");
      this.append(namedInput);
      this.namedInput = namedInput;
    }
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
  // #endregion

  // #region Event handlers
  /**
   * Handle input events on the custom element.
   * These will be triggered by the slotted input
   * element, then bubble up.
   */
  handleInput(event) {
    const query = event?.target?.value;

    if (query) {
      this.setListItems(this.filterItems(this.listItems, query));
    } else {
      this.setListItems(this.listItems);
    }

    // Update UI elements accordingly
    this.handleTextInput(event);
  }

  handleFocus() {
    this.showList();
  }

  /**
   * Event handler for keydown, mapped
   * to the keys that we care about
   */
  handleKeyDown(event) {
    let handled = true;
    if (event.key === "ArrowDown" || event.key === "Down") {
      this.navigateDown(event.target);
    } else if (event.key === "ArrowUp" || event.key === "Up") {
      this.navigateUp(event.target);
    } else if (event.key === "Escape") {
      this.hideList();
    } else if (event.key === "Enter") {
      this.chooseOption(event);
    } else {
      handled = false;
    }

    if (handled) {
      event.preventDefault();
    }
  }

  /**
   * Handler for a change event triggered on
   * this component.
   * The event will be dispatched when a value
   * has been _chosen_ (as opposed to 'selected')
   * and the corresponding `value` property has been
   * changed.
   * In this handler, we determine whether or not
   * to show the clear button.
   */
  handleTextInput() {
    if (this.input.value) {
      this.clearButton.classList.remove("display-none");
      this.clearButton.classList.add("display-block");
    } else {
      this.clearButton.classList.add("display-none");
      this.clearButton.classList.remove("display-block");
    }
  }

  submit() {
    // Find the nearest parent form element and submit it.
    this.closest("form")?.submit();
  }
  // #endregion

  // #region State management
  /**
   * Shows the unordered list of results to the user.
   * Visually selects the first item if there are
   * items in the list
   */
  showList() {
    this.input.setAttribute("aria-expanded", "true");
    this.setAttribute("expanded", "true");
    const listIsEmpty = this.querySelector("ul:empty");
    if (!listIsEmpty) {
      // We want to give the artificial focus,
      // which means temporary selection both
      // in aria and in visual styling,
      // to the first element in the dropdown
      const firstListItem = this.querySelector(`ul li[role="option"]`);
      if (firstListItem) {
        this.pseudoFocusListItem(firstListItem);
      }

      this.querySelector("ul li")?.scrollIntoView({
        block: "nearest",
        inline: "start",
      });
    }
  }

  /**
   * Hides the results list from display.
   * Note that it returns focus to the
   * combobox input element
   */
  hideList() {
    this.setAttribute("expanded", "false");
    this.input.setAttribute("aria-expanded", "false");
    this.input.setAttribute("aria-activedescendant", "");
  }

  /**
   * Toggles the display of the list
   */
  toggleList() {
    if (this.isShowingList) {
      this.hideList();
    } else {
      this.showList();
    }
  }

  /**
   * Resets the list to just the provided items.
   * @var items [items] The items that should be represented in the list
   *            These are objects. They must have value and text properties.
   *            The value property is the value that should be sent to the form
   *            when submitted. The text property is what will be displayed to
   *            the user in the list. If there are any other properties, they
   *            will be stored in the list item's data-meta property as JSON-
   *            encoded text
   */
  setListItems(items) {
    const list = document.createElement("ul");
    list.setAttribute("aria-labeledby", `${this.id}--list`);
    list.classList.add("wx-combo-box__list");

    const listItems = items.map((item, idx) => {
      const { value, text, ...meta } = item;

      const li = document.createElement("li");
      li.innerText = text;
      li.id = `${this.id}--item-${idx + 1}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-setsize", text.length);
      li.setAttribute("aria-posinset", idx + 1);
      li.setAttribute("aria-selected", "false");
      li.setAttribute("data-value", value);
      li.setAttribute("data-meta", JSON.stringify(meta));
      li.classList.add("wx-combo-box__list-option");

      li.addEventListener("mousedown", (e) => {
        // Stop the input from losing focus by
        // blocking normal browser behavior here
        e.preventDefault();
      });

      li.addEventListener("click", this.chooseOption);

      return li;
    });

    list.append(...listItems);
    this.querySelector('[slot="listbox"]').replaceChildren(list);
  }

  /**
   * Remove the pseudo-focus from all
   * items in the listbox
   */
  pseudoBlurItems() {
    Array.from(this.listbox.querySelectorAll(`li[role="option"]`)).forEach(
      (li) => {
        li.setAttribute("aria-selected", "false");
        li.classList.remove("wx-combo-box__list-option--focused");
        li.classList.remove("wx-combo-box__list-option--selected");
      },
    );
    this.input.setAttribute("aria-activedescendant", "");
  }

  /**
   * Handles the case where the user has pressed
   * the arrow down key in a result list or input.
   * If the list is not currently open, this action opens it.
   * Otherwise, it nagivates down to the next item in the list,
   * giving it focus.
   */
  navigateDown() {
    // If we are not already showing the list,
    // then we should now show it and focus
    // on the first item in the list
    if (!this.isShowingList) {
      this.showList();
      return;
    }

    let nextItem;
    const currentSelection = this.querySelector('li[aria-selected="true"]');
    if (!currentSelection) {
      nextItem = this.querySelector(`li[role="option"]`);
    } else {
      const allOptions = Array.from(this.querySelectorAll('li[role="option"]'));
      const index = allOptions.indexOf(currentSelection);

      if (index >= 0 && index < allOptions.length - 1) {
        nextItem = allOptions[index + 1];
      }
    }

    // Per WCAG guidelines, we can do nothing
    // if the pseudo-focus is on the last item.
    if (nextItem) {
      this.pseudoFocusListItem(nextItem);
    }
  }

  /**
   * Handles the case where the user has pressed
   * the arrow up key in a result list or input.
   * If the first item is currently selected, this action will
   * hide the list and return the focus to the input.
   * Otherwise, it selects and gives focus to the previous
   * item in the list.
   */
  navigateUp() {
    if (!this.isShowingList) {
      return;
    }

    const currentSelection = this.listbox.querySelector(
      'li[aria-selected="true"]',
    );
    if (!currentSelection) {
      this.hideList();
    }

    // If the selected item matches the first item in the list
    // then we close the list;
    const listItems = Array.from(
      this.listbox.querySelectorAll(`li[role="option"]`),
    );
    const currentItemIndex = listItems.indexOf(currentSelection);
    if (currentItemIndex <= 0) {
      this.hideList();
      return;
    }

    // Otherwise, we navigate to the previous item in the list
    const nextItem = listItems[currentItemIndex - 1];

    if (nextItem) {
      this.pseudoFocusListItem(nextItem);
    } else {
      this.hideList();
    }
  }

  /**
   * Gives pseudo-focus to the passed list item element,
   * blurring all the others accordingly.
   * @var anElement HTMLElement - A list item element
   */
  pseudoFocusListItem(anElement) {
    this.pseudoBlurItems();
    anElement.setAttribute("aria-selected", "true");
    anElement.classList.add(
      "wx-combo-box__list-option--focused",
      "wx-combo-box__list-option--selected",
    );

    // Scroll the list item into view if it is
    // not currently visible in the list. This is to
    // help users with difficult vision
    anElement.scrollIntoView({ block: "nearest", inline: "start" });

    // Update the input's activedescendant attribute
    // to refer to this list item's id
    this.input.setAttribute("aria-activedescendant", anElement.id);
  }

  /**
   * Choses one of the list item options,
   * determined based on the originating event
   * object that is passed in.
   * This handler can be triggered either by a
   * click event or pressing Enter while on
   * a pseudo-focused list item.
   */
  chooseOption(event) {
    let selectedItem = this.listbox.querySelector('li[aria-selected="true"]');
    if (event.type === "click") {
      // If the event was a click, then
      // the actual item we want isn't the current
      // pseudo-focus/selection, but instead the
      // target of the mouse event itself
      selectedItem = event.target;
    }

    // Set this component's selectedIndex and
    // value to the corresponding properties
    this.selectedIndex = Array.from(
      this.listbox.querySelectorAll(`li[role="option"]`),
    ).indexOf(selectedItem);
    this.value = selectedItem.getAttribute("data-value");
    this.url = selectedItem.getAttribute("data-url");

    // Display the text of the selected item
    // in the input field and update the named input.
    this.input.value = selectedItem.textContent;
    if (this.namedInput) {
      this.namedInput.value = selectedItem.dataset.value;
    }

    // Hide list and trigger change event
    this.hideList();
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  filterItems(itemList, query) {
    const regex = new RegExp(query, "i");
    return itemList.filter(({ text }) => regex.test(text));
  }

  getItemByValue(value) {
    return this.listbox.querySelector(`li[data-value='${value}']`);
  }

  /**
   * Clear all chosen information from this component
   */
  clear() {
    this.input.value = null;
    if (this.namedInput) {
      this.namedInput.value = null;
    }
    this.selectedItemIndex = -1;
    this.value = null;
    this.setListItems(this.listItems);
    this.input.setAttribute("aria-activedescendant", "");
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  get isShowingList() {
    return this.input.getAttribute("aria-expanded") === "true";
  }
  // #endregion
}

window.customElements.define("wx-combo-box", ComboBox);

export default ComboBox;
