/**
 * WCAG compliant Combobox component
 */
const comboTemplate = `
<div>
  <slot name="input"></slot>
  <div>
    <slot name="clear-button"></slot>
    <slot name="toggle-button"></slot>
  </div>
</div>
<slot name="popup"></slot>
`;
export default class Combobox extends HTMLElement {
  constructor() {
    super();
    this.popup = null;

    this.template = document.createElement("template");
    this.template.innerHTML = comboTemplate;
    this.attachShadow({ mode: "open", delegatesFocus: true });
    this.shadowRoot.append(this.template.content.cloneNode(true));
    this.shadowRoot.addEventListener(
      "slotchange",
      this.handleSlotChange.bind(this),
    );

    // Bound methods
    this.handleInput = this.handleInput.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleListboxMouseDown = this.handleListboxMouseDown.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.showPopup = this.showPopup.bind(this);
    this.hidePopup = this.hidePopup.bind(this);
    this.submit = this.submit.bind(this);
    this.handlePopupChange = this.handlePopupChange.bind(this);
    this.handleToggleClick = this.handleToggleClick.bind(this);
    this.handleClearClick = this.handleClearClick.bind(this);
  }

  connectedCallback() {
    // We need to ensure that the component has a unique id.
    // This is used to compute popup option ids, which are necessary
    // for the correct usage of aria-activedescendant and related
    // pseudo-focus capabilites for assistive technologies.
    if (!this.id) {
      console.error(
        `${this.tagName.toLowerCase()} requires an 'id' attribute to be set`,
      );
    }

    // Keyboard and input based events will be listened for on
    // the input element specifically, and handled on this component.
    this.input = this.querySelector(`input[slot="input"]`);
    if (this.input) {
      this.input.addEventListener("input", this.handleInput);
      this.input.addEventListener("keydown", this.handleKeyDown);
      this.input.addEventListener("focus", this.handleFocus);
      this.input.addEventListener("blur", this.handleBlur);
    }

    this.addEventListener("focus", this.handleFocus);
    this.addEventListener("blur", this.handleBlur);

    // The wx:popup-nav is a custom event that will be fired by any
    // element that is serving as the combobox's popup, such as a
    // listbox, whenever a navigation event occurs in that element.
    // In our most common use case, this is when the pseudoFocus
    // is moved within a listbox that is slotted in this combobox.
    this.addEventListener("wx:popup-nav", this.handlePopupNav);

    // Set up the appropriate event handlers for the clear button
    // and the toggle button.
    this.toggleButton = this.querySelector(`[slot="toggle-button"]`);
    if (this.toggleButton) {
      this.toggleButton.addEventListener("click", this.handleToggleClick);
    }
    this.clearButton = this.querySelector(`[slot="clear-button"]`);
    if (this.clearButton) {
      this.clearButton.addEventListener("click", this.handleClearClick);
    }
  }

  /**
   * Will attempt to show the popup child
   * element for the combobox, while setting
   * the appropriate aria attributes needed for
   * both screenreading and styling.
   */
  showPopup() {
    if (this.input) {
      this.input.setAttribute("aria-expanded", true);
      this.setAttribute("expanded", true);
    }
    if (this.popup) {
      const target = this.popup.selection ?? this.popup.pseudoFocus;
      if (target) {
        this.popup.pseudoFocusItem(target);
      }
    }
  }

  /**
   * Will hide the popup child element
   * for the combobox, by setting the appropriate
   * attributes needed for screenreading and styling
   */
  hidePopup() {
    this.removeAttribute("expanded");
    this.input.removeAttribute("aria-expanded");
    this.input.removeAttribute("aria-activedescendant");
  }

  /**
   * Find the closest ancestor <form> element.
   * If there is one, trigger its submit() method.
   * Because we work with an input, it will be
   * considered part of that form and its data will be
   * used as part of the form action.
   */
  submit() {
    this.closest("form")?.submit();
  }

  /**
   * Handle any changes to slotted elements.
   * This is where we bind and/or remove listeners for
   * the component that serves as the popup for the
   * combobox (usually a listbox).
   * We do it here instead of at component callback time
   * because we want to leave open the possibility for
   * popups to be dynamically swapped out if needed,
   * and to still have all the appropriate event handling
   * setup when that happens.
   * This handler also sets ids on the popup itself if
   * there isn't already one, as well as updating the
   * combobox input aria-controls to map to the
   * incoming popup element.
   */
  handleSlotChange(event) {
    const name = event.target.getAttribute("name");
    const assigned = event.target.assignedElements();

    if (name === "popup") {
      // If there is an existing popup that was attached,
      // remove any event listeners from it.
      if (this.popup) {
        this.popup.removeEventListener("change", this.handlePopupChange);
        this.popup.removeEventListener(
          "mousedown",
          this.handleListboxMouseDown,
        );
      }

      // Now check if there is a new popup assigned or
      // if the slot is empty. Either way assign the value
      // to the stored popup
      this.popup = assigned.length ? assigned[0] : null;
      if (this.popup) {
        this.popup.addEventListener("change", this.handlePopupChange);
        this.popup.addEventListener("mousedown", this.handleListboxMouseDown);

        // If the listbox element does not have an id set, use
        // this component's id as a base for creating a unique id.
        // The listbox options need to have their own unique ids
        // for the use of aria-activedescendant, which handles pseudo
        // focus in assistive technologies
        if (!this.popup.id) {
          this.popup.id = `${this.id}-popup`;

          // Trigger slotchange event manually
          this.popup.innerHTML = this.popup.innerHTML;
        }
        this.input.setAttribute("aria-controls", this.popup.id);

        this.handlePopupChange({ target: this.popup });
      }
    }
  }

  /**
   * We need to stop the default behavior of mousedown
   * on the listbox, so that the normal browser doesn't
   * try to change focus/blur. This is what otherwise happens
   * in FF and Safari (but not Chrome), where click events
   * in the listbox will never be hit because by that time
   * the input has already blurred and lost focus.
   */
  handleListboxMouseDown(event) {
    event.preventDefault();
  }

  /**
   * Handle specific popup navigation event cases.
   * We want to open the popup if the user tries to
   * navigate down and it's not already open.
   * Likewise, if we are already at the top of the popup and
   * we move up again, it should hide the component.
   * An additional behavior that is crucial for accessibility
   * is that any popup child that has pseudofocus will be mapped
   * to the combobox input's aria-activedescendant, which is a
   * way of mapping screenreader focus that is separate from
   * browser element focus.
   */
  handlePopupNav(event) {
    if (event.detail.beyondTop) {
      // If the user has navigated beyond the top option in the list
      // (usually a #moveUp when the first item is already selected),
      // we hide the list
      this.hidePopup();
    } else if (
      event.detail.navCommand === "moveDown" &&
      !event.detail.previous
    ) {
      // If there was no previous focus element and we are moving down,
      // we should attempt to open the popup. This scenario can occur if:
      // 1. The user has focused the input, revelating the popup, then
      // 2. The user navigated up past the first item, closing the popup, then
      // 3. The user navigated down again
      this.showPopup();
    }

    // If there is an item pseudoFocused, we update
    // aria-activedescendant.
    // Otherwise, remove the attribute entirely
    if (event.target.pseudoFocus) {
      this.input.setAttribute(
        "aria-activedescendant",
        event.target.pseudoFocus.id,
      );
    } else {
      this.input.removeAttribute("aria-activedescendant");
    }
  }

  /**
   * Popup elements can fire generic change events.
   * In the case of a combobox, we expect that the target
   * of the event can have a selection.
   * Set the value of the combobox input to the provided selection.
   */
  handlePopupChange(event) {
    if (event.target.selection) {
      this.hidePopup();

      const option = event.target.selection;
      const value = option.getAttribute?.("data-value");

      // "data-value-for" is the id of a hidden input used to store the "real" value
      const id = this.input.getAttribute("data-value-for");

      if (value && id) {
        const element = this.querySelector(`input[name=${id}][type=hidden]`);
        if (element) element.value = value;
      }

      this.input.value = event.target.selection.textContent || null;
    } else {
      this.input.value = null;
    }

    if (this.input.value) {
      const clearButton = this.querySelector(`[slot="clear-button"]`);
      clearButton.classList.remove("empty");
    }
  }

  /**
   * The combobox keydown event handler will attempt
   * to find a keyMapping dictionary on its slotted popup
   * component, such as is available for a listbox.
   * This allows us to trigger the popup's handlers for the given
   * keys, without needed to implement them all over again
   * in this component.
   */
  handleKeyDown(event) {
    const popupIsOpen = this.getAttribute("expanded") === "true";
    if (this.popup) {
      if (event.key === "Escape") {
        this.popup.pseudoFocusItem(null);
        return this.hidePopup();
      } else if (event.key === "ArrowDown" && !popupIsOpen) {
        // We focus the first item
        this.popup.pseudoFocusItem(
          this.popup.querySelector(`[role="option"][data-option-index="0"]`),
        );
        return this.showPopup();
      }

      // Otherwise, let the listbox handle the event, so long
      // as it has a keymapping defined.
      if (this.popup.keyMapping) {
        const handler = this.popup.keyMapping[event.key];
        if (handler) {
          const boundHandler = handler.bind(this.popup);
          boundHandler(event);
          event.preventDefault();
        }
      }
    }
  }

  /**
   * Cick handler for the toggle button.
   * Will show or hide the popup depending
   * on the state.
   */
  handleToggleClick(event) {
    event.preventDefault();
    if (this.getAttribute("expanded") === "true") {
      this.hidePopup();
    } else {
      this.showPopup();
      this.input.focus();
    }
  }

  /**
   * Click handler for the clear button.
   * Will clear the input and reset state on the
   * popup.
   */
  handleClearClick(event) {
    event.preventDefault();
    this.popup.pseudoFocusItem(null);
    this.input.value = "";
    this.handleInput();
    this.input.focus();
    this.hidePopup();
  }

  /**
   * Text input handler for the combobox input element.
   * Will attempt to call the `filterText()` method of any
   * slotted popup element using the input's current value.
   * Will also update the presence of the clear button based
   * on the input's new value.
   */
  handleInput(event) {
    if (this.popup) {
      if (!this.hasAttribute("expanded")) {
        this.showPopup();
      }
      if (this.popup.filterText) {
        this.popup.filterText(this.input.value);
      }
    }

    // Hide or show the clear button's slot
    // based on the input value's presence
    const clearButton = this.querySelector(`[slot="clear-button"]`);
    if (this.input.value && this.input.value !== "") {
      clearButton.classList.remove("empty");
    } else {
      clearButton.classList.add("empty");
    }
  }

  /**
   * When gaining focus, show the popup but only
   * if there are actual options available in the popup.
   */
  handleFocus(event) {
    const hasItems = this.popup.querySelectorAll(`[role="option"]`).length;
    if (hasItems) {
      this.showPopup();
    }
  }

  /**
   * Hide the popup when this element loses focus.
   */
  handleBlur(event) {
    // Only perform blur operations if the target of the
    // event is outside of the combobox component
    const ancestor = event.relatedTarget?.closest(this.tagName);
    if (ancestor !== this) {
      this.popup.pseudoFocusItem(null);
      this.hidePopup();
      if (this.popup && this.popup.selection) {
        this.input.value = this.popup.selection.textContent;
        const clearButton = this.querySelector(`[slot="clear-button"]`);
        clearButton.classList.remove("empty");
      }
    }
  }

  /**
   * The only attribute we listen for changes on is 'disabled',
   * which reacts by disabling (or re-enabling) all constinuent
   * elements that can be disabled. This prevents any key or mouse
   * events from triggering event handlers.
   */
  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "disabled" && newVal === "true") {
      this.input.setAttribute("disabled", true);
      this.clearButton.setAttribute("disabled", true);
      this.toggleButton.setAttribute("disabled", true);
      this.hidePopup();
    } else if (name === "disabled") {
      this.input.removeAttribute("disabled");
      this.clearButton.removeAttribute("disabled");
      this.toggleButton.removeAttribute("disabled");
    }
  }

  get isExpanded() {
    return this.getAttribute("expanded") === "true";
  }

  static get observedAttributes() {
    return ["disabled"];
  }
}

if (!window.customElements.get("wx-combobox")) {
  window.customElements.define("wx-combobox", Combobox);
}
