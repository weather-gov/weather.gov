/* eslint object-shorthand: 0, func-names: 0, no-underscore-dangle: 0 */
const searchLocation = async (text) => {
  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json&countryCode=USA%2CPRI%2CVIR%2CGUM%2CASM&category=Land+Features%2CBay%2CChannel%2CCove%2CDam%2CDelta%2CGulf%2CLagoon%2CLake%2COcean%2CReef%2CReservoir%2CSea%2CSound%2CStrait%2CWaterfall%2CWharf%2CAmusement+Park%2CHistorical+Monument%2CLandmark%2CTourist+Attraction%2CZoo%2CCollege%2CBeach%2CCampground%2CGolf+Course%2CHarbor%2CNature+Reserve%2COther+Parks+and+Outdoors%2CPark%2CRacetrack%2CScenic+Overlook%2CSki+Resort%2CSports+Center%2CSports+Field%2CWildlife+Reserve%2CAirport%2CFerry%2CMarina%2CPier%2CPort%2CResort%2CPostal%2CPopulated+Place&maxSuggestions=10&_=1695666335097&text=${text}`;
  return fetch(url, { headers: { "Content-Type": "application/json" } });
};

const getLocationGeodata = async (magicKey) => {
  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find?magicKey=${magicKey}&f=json&_=1695666335115`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });
  const results = await response.json();

  if (
    !results.error &&
    Array.isArray(results.locations) &&
    results.locations.length > 0
  ) {
    const {
      locations: [
        {
          feature: { geometry },
        },
      ],
    } = results;

    const lat = Math.round(geometry.y * 1_000) / 1_000;
    const lon = Math.round(geometry.x * 1_000) / 1_000;
    return { lat, lon };
  }
  return null;
};

/**
 * This object uses the browser's SessionStorage
 * to cache and retrieve ArcGIS magicKey data.
 * Each time a user navigates to a list option,
 * we fetch the result for that option asynchronously
 * and store in this cache.
 * Later, if the user selects an option, we first check
 * for the cached data before sending a request.
 * This can provide the perception of faster interaction.
 */
const ArcCache = {
  getItem: function (magicKey) {
    const found = window.sessionStorage.getItem(magicKey);
    if (found) {
      return JSON.parse(found);
    }
    return null;
  },
  setItem: function (magicKey, obj) {
    const serialized = JSON.stringify(obj);
    window.sessionStorage.setItem(magicKey, serialized);
  },
};

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

class ComboBox extends HTMLElement {
  constructor() {
    super();

    this.template = document.createElement("template");
    this.template.innerHTML = comboTemplate;
    this.attachShadow({ mode: "open", delegatesFocus: true });
    this.shadowRoot.append(this.template.content.cloneNode(true));

    // Private property defaults
    this.inputDelay = 250;
    this.selectedIndex = -1;
    this.value = null;

    // Bound component methods
    this.handleInput = this.handleInput.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTextInput = this.handleTextInput.bind(this);
    this.updateSearch = this.updateSearch.bind(this);
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
    this.cacheLocationGeodata = this.cacheLocationGeodata.bind(this);
    this.getGeodataForKey = this.getGeodataForKey.bind(this);
    this.updateAriaLive = this.updateAriaLive.bind(this);
    this.initInput = this.initInput.bind(this);
    this.initListbox = this.initListbox.bind(this);
    this.initToggleButton = this.initToggleButton.bind(this);
    this.initClearButton = this.initClearButton.bind(this);
    this.saveSearchResult = this.saveSearchResult.bind(this);
    this.getSavedResults = this.getSavedResults.bind(this);
    this.getSearchResults = this.getSearchResults.bind(this);
  }

  connectedCallback() {
    // Initial attributes
    this.classList.add("wx-combo-box");
    this.setAttribute("expanded", "false");

    // If we have not provided an id, set a default value
    if (!this.id) {
      const otherCombosCount = document.querySelectorAll("wx-combo-box").length;
      this.id = `combo-box-${otherCombosCount}`;
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
    this.addEventListener("blur", this.hideList);
    this.input.addEventListener("blur", this.hideList);
    this.input.addEventListener("focus", () => {
      this.updateSearch("");
    });

    if (this.dataset.place) {
      this.saveSearchResult({
        text: this.dataset.place,
        url: window.location.pathname,
      });
    }
  }

  disconnectedCallback() {
    this.removeEventListener("input", this.handleInput);
    this.removeEventListener("keydown", this.handleKeyDown);
    this.removeEventListener("change", this.handleTextInput);
    this.removeEventListener("blur", this.hideList);
    this.input.removeEventListener("blur", this.hideList);
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

  /**
   * Handle input events on the custom element.
   * These will be triggered by the slotted input
   * element, then bubble up.
   */
  handleInput(event) {
    if (this._timeout) {
      window.clearTimeout(this._timeout);
    }
    this._timeout = window.setTimeout(async () => {
      await this.updateSearch(event.target.value).then(() => {
        this.updateAriaLive(
          `Search updated. ${this.querySelectorAll("li").length} results available`,
        );
      });
    }, this.inputDelay);

    this.handleTextInput(event);
  }

  async getSearchResults(text) {
    const response = await searchLocation(text);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return { suggestions: [] };
  }

  /**
   * Triggered by input changes.
   * Will make a request to the ArcGIS endpoint
   * for search results.
   * Clears out the current list items and select
   * options, then creates new versions of each set,
   * with the correct classes and event handlers
   * set up.
   */
  async updateSearch(text) {
    const data = await this.getSearchResults(text);

    const makeSectionHeading = (title) => {
      const heading = document.createElement("li");
      heading.textContent = title;
      heading.classList.add("font-mono-sm", "text-base", "padding-1");
      heading.setAttribute("role", "presentation");
      return heading;
    };

    const makeListItem = (suggestion, idx) => {
      const li = document.createElement("li");
      li.innerText = suggestion.text;
      li.setAttribute("role", "option");
      li.setAttribute("aria-setsize", data.suggestions.length);
      li.setAttribute("aria-posinset", idx + 1);
      li.setAttribute("aria-selected", "false");
      if (suggestion.magicKey) {
        li.setAttribute("data-value", suggestion.magicKey);
      } else if (suggestion.url) {
        li.setAttribute("data-url", suggestion.url);
      } else {
        return null;
      }
      li.classList.add(...["wx-combo-box__list-option"]);
      li.id = `${this.id}--item-${idx + 1}`;

      li.addEventListener("focus", (e) => {
        this.cacheLocationGeodata(e.target.dataset.value);
      });
      li.addEventListener("mousedown", (event) => {
        // Stop the input from losing focus by
        // blocking normal browser behavior here
        event.preventDefault();
      });
      li.addEventListener("click", this.chooseOption);
      return li;
    };

    const saved = this.getSavedResults(text);

    const items = [];

    // If there are saved items, we want to put in a heading list item for them
    // and possibly a heading list item for current search results as well.
    if (saved.length) {
      const list = document.createElement("ul");
      list.setAttribute("aria-labeledby", `${this.id}--list`);
      list.classList.add("wx-combo-box__list");

      list.append(makeSectionHeading("recent locations"));
      list.append(...saved.map(makeListItem));
      items.push(list);
    }

    // Now add search results, if any.
    if (data.suggestions.length) {
      const list = document.createElement("ul");
      list.setAttribute("aria-labeledby", `${this.id}--list`);
      list.classList.add("wx-combo-box__list");

      if (saved.length) {
        list.append(makeSectionHeading("search results"));
      }
      list.append(...data.suggestions.map(makeListItem));

      items.push(list);
    }

    // Append to shadow select element
    this.querySelector('[slot="listbox"]').replaceChildren(...items);

    // If there are results, show the area
    if (saved.length || data.suggestions.length) {
      this.showList();
    } else {
      this.hideList();
    }
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
    // in the input field
    this.input.value = selectedItem.textContent;

    // Hide list and trigger change event
    this.hideList();
    this.dispatchEvent(new Event("change", { bubbles: true }));

    // Always submit to the parent form
    this.submit();
  }

  /**
   * Clear all chosen information from this component
   */
  clear() {
    this.input.value = null;
    this.selectedItemIndex = -1;
    this.value = null;
    this.input.setAttribute("aria-activedescendant", "");
    this.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /**
   * Triggers a submit call on an ancestor form element,
   * if present.
   */
  submit() {
    const formEl = this.closest("form[data-location-search]");

    if (formEl) {
      // If there is a loader component available,
      // display it
      const loader = document.querySelector("wx-loader");
      if(loader){
        loader.classList.remove("display-none");
      }
      
      if (this.url) {
        const result = {
          text: this.input.value,
          url: this.url,
        };

        this.saveSearchResult(result);
        formEl.setAttribute("action", this.url);
        return formEl.submit();
      }

      return this.getGeodataForKey(this.value).then((coordinates) => {
        if (coordinates) {
          const result = {
            text: this.input.value,
            url: `/point/${coordinates.lat}/${coordinates.lon}`,
          };

          this.saveSearchResult(result);

          formEl.setAttribute("action", result.url);
          formEl.submit();
        }
      });
    }

    return Promise.reject(
      new Error("No form ancestor element found for this combobox"),
    );
  }

  /**
   * Asynchronously fetches specific location data
   * for a given search result, stashing it away in
   * the cache (See ArcCache)
   */
  async cacheLocationGeodata(magicKey) {
    if (!window.sessionStorage.getItem(magicKey)) {
      const result = await getLocationGeodata(magicKey);
      ArcCache.setItem(magicKey, result);
    }
  }

  /**
   * Attempts to retrieve location data for a search
   * result by its magicKey from the cache.
   * If not present, will make the Arc API call
   * to fetch the data.
   */
  async getGeodataForKey(magicKey) {
    const cached = ArcCache.getItem(magicKey);
    if (!cached) {
      return getLocationGeodata(magicKey);
    }

    return cached;
  }

  saveSearchResult(result) {
    try {
      // When loading previously-saved results, immediately remove any items for
      // the same URL. We'll replace them with the new one. This way we don't
      // end up having a whole list of the same place.
      const saved = JSON.parse(
        localStorage.getItem("wxgov_recent_locations") ?? "[]",
      ).filter(({ url }) => url !== result.url);

      // Put the new one at the front of the list.
      saved.unshift(result);

      localStorage.setItem(
        "wxgov_recent_locations",
        // We don't want to save everything forever. Just keep the most recent
        // ten. We'll handle filtering down at display time.
        JSON.stringify(saved.slice(0, 10)),
      );
    } catch (e) {
      // Do nothing. If we're here, either the browser doesn't have local
      // storage (which is unlikely in 2024, but possible), or it is
      // disabled and we can't use it.
    }
  }

  getSavedResults(searchText) {
    try {
      const results = JSON.parse(
        localStorage.getItem("wxgov_recent_locations") ?? "[]",
      );

      const regex = new RegExp(`^${searchText}`, "i");

      return results.filter(({ text }) => regex.test(text)).slice(0, 3);
    } catch (e) {
      return [];
    }
  }

  /**
   * Adds a span of screenreader only text to
   * this component's shadow aria-live region,
   * which it itself also hidden.
   * Makes use of a slot called "sr-only".
   * The update is on a 1 second delay, which is preferred
   * based on convos with USWDS.
   */
  updateAriaLive(text) {
    if (this._ariaLiveTimeout) {
      window.clearTimeout(this._ariaLiveTimeout);
    }
    this._ariaLiveTimeout = window.setTimeout(() => {
      Array.from(this.querySelectorAll("[slot='sr-only']")).forEach((span) =>
        span.remove(),
      );
      const span = document.createElement("span");
      span.setAttribute("slot", "sr-only");
      span.innerText = text;
      this.append(span);
    }, 1000);
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "input-delay") {
      this.inputDelay = parseInt(newVal, 10);
    }
  }

  get isShowingList() {
    return this.input.getAttribute("aria-expanded") === "true";
  }

  static get observedAttributes() {
    return ["input-delay"];
  }
}

window.customElements.define("wx-combo-box", ComboBox);
