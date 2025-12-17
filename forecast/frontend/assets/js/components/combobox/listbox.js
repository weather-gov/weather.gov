/**
 * WCAG compliant listbox component
 * See https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
 */

export default class Listbox extends HTMLElement {
  constructor(){
    super();

    this.template = document.createElement("template");
    this.template.innerHTML = `
        <slot></slot>`;
    this.attachShadow({mode: "open"});
    this.shadowRoot.append(this.template.content.cloneNode(true));

    // Maps a key name to a handler for
    // key events by the name of the key
    this.keyMapping = {
      "ArrowUp": this.moveUp,
      "ArrowDown": this.moveDown,
      "Enter": this.selectPseudoFocused,
      "Home": this.moveHome,
      "End": this.moveEnd
    };

    // Bind methods
    this.bindEventListeners = this.bindEventListeners.bind(this);
    this.unbindEventListeners  = this.unbindEventListeners.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleItemsChanged = this.handleItemsChanged.bind(this);
    this.moveDown = this.moveDown.bind(this);
    this.moveUp = this.moveUp.bind(this);
    this.moveHome = this.moveHome.bind(this);
    this.moveEnd = this.moveEnd.bind(this);
    this.selectPseudoFocused = this.selectPseudoFocused.bind(this);
    this.pseudoFocusItem = this.pseudoFocusItem.bind(this);
    this.selectItem = this.selectItem.bind(this);

    this.bindEventListeners();
  }

  connectedCallback(){
    this.bindEventListeners();
    this.setAttribute("role", "listbox");
  }

  disconnectedCallback(){
    this.unbindEventListeners();
  }

  bindEventListeners(){
    this.addEventListener("focus", this.handleFocus);
    this.shadowRoot.querySelector("slot").addEventListener("slotchange", this.handleItemsChanged);
    this.addEventListener("keydown", this.handleKeyDown);
    this.addEventListener("click", this.handleClick);
  }

  unbindEventListeners(){
    this.removeEventListener("focus", this.handleFocus);
    this.removeEventListener("keydown", this.handleKeyDown);
    this.removeEventListener("click", this.handleClick);
  }

  handleFocus(e){
    // Automatically pseudo-focus the
    // selected item.
    // If there is no selected item,
    // use the first item.
    const selected = this.selection;
    if(selected){
      this.pseudoFocusItem(selected);
    } else {
      const first = this.querySelector(`[role="option"]`);
      if(first){
        this.pseudoFocusItem(first);
      }
    }
  }

  handleClick(event){
    // We check to see if one of the options is in
    // the chain of the bubbled click event
    const closestOption = event.target.closest(`[role="option"]`);
    if(closestOption){
      event.currentTarget.selectItem(closestOption);
    }
  }

  /**
   * Attempts to look up a bound event handler
   * for the given key, and calls it.
   * Does nothing if the given key is not in
   * the component's keyMapping dictionary.
   */
  handleKeyDown(event){
    if(event.target.keyMapping){
      const handler = event.target.keyMapping[event.key];
      if(handler){
        handler.bind(this)(event);
        event.preventDefault();
      }
    }
  }

  /**
   * Handler for when slotted elements change.
   * This is where we configure our listbox option
   * elements as they are attached/removed.
   * In this case, we add the data-option-index
   * attribute to specify an order of options as they
   * are presented in the dom (even though they can
   * be nested in different lists).
   * We also give each option an id based on the
   * current component's id, if there isn't one already
   * present.
   */
  handleItemsChanged(event){
    const host = event.target.getRootNode().host;
    Array.from(
      host.querySelectorAll(`[role="option"]`)
    ).forEach((option, idx) => {
      option.setAttribute("data-option-index", idx);

      // If the listbox itself has an id set, use
      // that as a base for setting unique ids on
      // each option. Do not set any id on an option
      // that already has an id value.
      // These ids are necessary for other wrapping
      // components -- like a combobox -- that need
      // to use aria-activedescendant to manage assistive
      // technology focus capabilities.
      if(!option.id && host.id){
        option.id = `${host.id}-option-${idx}`;
      }
    });
  }

  /**
   * Pseudo Focus is what we are calling screenreader
   * focus that is separate from the browser's DOM focus.
   * It is managed primarily by the use of aria-activedescendant
   * and should also be visually indicated through styling.
   * This method removes the pseudo-focus state from all elements
   * and if an element is also passed in, adds the state to that element.
   * @param HTMLElement element
   */
  pseudoFocusItem(element){
    // If the passed on object is null or falsy,
    // we un-focus all options in this component
    Array.from(
      this.querySelectorAll(`[role="option"]`)
    ).forEach(option => {
      option.removeAttribute("data-pseudo-focus");
    });

    if(element){
      element.setAttribute("data-pseudo-focus", "true");

      // Some listboxes might be inside an overflowed
      // or scrolling container. Be sure to scroll the
      // focused item into view
      element.scrollIntoView({block: "end", inline: "nearest"});

      // If this component as the attribute
      // `selection-follows-focus` set to "true",
      // we also select the element we are focusing
      if(this.getAttribute("selection-follows-focus") === "true"){
        this.selectItem(element);
      }
    }
  }

  /**
   * If there is an item that is currently pseudo-focused,
   * this method will call selectItem on that element.
   */
  selectPseudoFocused(){
    const element = this.pseudoFocus;
    if(element){
      this.selectItem(element);
    }
  }

  /**
   * Select item marks the provided element as being
   * selected, for the purposes of listbox selection.
   * It will also remove selection on any previously
   * selected element(s).
   * If the fireEvent parameter is set to true (as is by default),
   * a change event will be dispatched from this component.
   * @param HTMLElement element
   * @param boolean fireEvent - Whether or not to dispatch
   * a change event after selection. True by default.
   */
  selectItem(element, fireEvent=true){
    // De-select any that are already selected
    Array.from(this.querySelectorAll(`[aria-selected="true"]`))
      .forEach(selectedEl => {
        selectedEl.removeAttribute("aria-selected");
      });

    // If there is an incoming element, select that one.
    // By moving this into a cased control flow,
    // we ensure that passing a falsy value for the element
    // has the effect of clearing the current selection only.
    if(element){
      element.setAttribute("aria-selected", "true");
      this.value = element.getAttribute("value");
    }

    if(fireEvent){
      this.dispatchEvent(
        new Event("change", {
          bubbles: true,
          cancelable: true
        })
      );
    }
  }

  /**
   * Moves the pseudo focus one option previous
   * in the listbox, based on overall option order.
   * Navigation triggers the custom event wx:popup-nav
   */
  moveUp(event){
    // Find the element with the pseudo-focus.
    // If there isn't one, bail.
    const current = this.pseudoFocus;
    if(current){
      const options = Array.from(this.querySelectorAll(`[role="option"]`));
      const currentIndex = options.indexOf(current);
      const prev = currentIndex > 0 ? options[currentIndex - 1] : null;
      // If prev does not exist, the call to pseudoFocusItem
      // will un-pseudo focus everything the component
      this.pseudoFocusItem(prev);
      this.dispatchEvent(
        new CustomEvent(
          "wx:popup-nav",
          {
            bubbles: true,
            detail: {
              previous: current,
              next: prev,
              beyondTop: !prev && !this.pseudoFocus,
              navCommand: "moveUp"
            }
          }
        )
      );
    }
  }

  /**
   * Moves the pseudo focus to the next option
   * element in the listbox, based on overall option
   * order.
   * Navigation triggers the custom event wx:popup-nav
   */
  moveDown(event){
    const current = this.pseudoFocus;
    const options = Array.from(this.querySelectorAll(`[role="option"]`));
    if(!options.length){
      return;
    }
    const firstOption = options[0];
    const lastOption = options[options.length - 1];
    if(current === lastOption){
      return;
    }
    const currentIndex = options.indexOf(current);
    const next = currentIndex >= 0 ? options[currentIndex + 1] : firstOption;
    
    if(next && (next !== current)){
      this.pseudoFocusItem(next);
      this.dispatchEvent(
        new CustomEvent(
          "wx:popup-nav",
          {
            bubbles: true,
            detail: {
              previous: current,
              next: next,
              navCommand: "moveDown"
            }
          }
        )
      );
    }
  }

  /**
   * Moves the pseudo focus to the last option overall.
   * Navigation triggers the custom event wx:popup-nav
   */
  moveHome(event){
    const current = this.pseudoFocus;
    const options = Array.from(this.querySelectorAll(`[role="option"]`));
    const firstOption = options.length ? options[0] : null;
    if(current && firstOption && (current !== firstOption)){
      this.pseudoFocusItem(firstOption);

      this.dispatchEvent(
        new CustomEvent(
          "wx:popup-nav",
          {
            bubbles: true,
            detail: {
              previous: current,
              next: firstOption
            }
          }
        )
      );
    }
  }

  /**
   * Moves the pseudo focus to the first option overall.
   * Navigation triggers the custom event wx:popup-nav
   */
  moveEnd(event){
    const current = this.pseudoFocus;
    const options = Array.from(this.querySelectorAll(`[role="option"]`));
    const lastOption = options.length ? options[options.length - 1] : null;
    if(current && lastOption && (current !== lastOption)){
      this.pseudoFocusItem(lastOption);

      this.dispatchEvent(
        new CustomEvent(
          "wx:popup-nav",
          {
            bubbles: true,
            detail: {
              previous: current,
              next: lastOption
            }
          }
        )
      );
    }
  }

  get selection(){
    return this.querySelector(`[role="option"][aria-selected="true"]`);
  }

  get pseudoFocus(){
    return this.querySelector(`[data-pseudo-focus="true"]`);
  }
  
  static get observedAttributes(){
    return [
      "selection-follows-focus"
    ];
  }
}

window.customElements.define("wx-listbox", Listbox);
