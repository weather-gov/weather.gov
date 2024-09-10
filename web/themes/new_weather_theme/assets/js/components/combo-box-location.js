import ComboBox from "./combo-box.js";

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
  getItem(magicKey) {
    const found = window.sessionStorage.getItem(magicKey);
    if (found) {
      return JSON.parse(found);
    }
    return null;
  },
  setItem(magicKey, obj) {
    const serialized = JSON.stringify(obj);
    window.sessionStorage.setItem(magicKey, serialized);
  },
};

export default class LocationComboBox extends ComboBox {
  constructor() {
    super();

    // Private property defaults
    this.inputDelay = 250;

    // Bound component methods
    this.updateSearch = this.updateSearch.bind(this);
    this.cacheLocationGeodata = this.cacheLocationGeodata.bind(this);
    this.getGeodataForKey = this.getGeodataForKey.bind(this);
    this.updateAriaLive = this.updateAriaLive.bind(this);
    this.saveSearchResult = this.saveSearchResult.bind(this);
    this.getSavedResults = this.getSavedResults.bind(this);
    this.getSearchResults = this.getSearchResults.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.dataset.place) {
      this.saveSearchResult({
        text: this.dataset.place,
        url: window.location.pathname,
      });
    }
  }

  /**
   * Handle input events on the custom element.
   * These will be triggered by the slotted input
   * element, then bubble up.
   */
  handleInput(event) {
    if (this.inputDebounceTimer) {
      window.clearTimeout(this.inputDebounceTimer);
    }
    this.inputDebounceTimer = window.setTimeout(async () => {
      await this.updateSearch(event.target.value).then(() => {
        this.updateAriaLive(
          `Search updated. ${this.querySelectorAll("li").length} results available`,
        );
      });
    }, this.inputDelay);

    this.handleTextInput(event);
  }

  handleFocus() {
    this.updateSearch("");
  }

  chooseOption(event) {
    super.chooseOption(event);

    // Always submit to the parent form
    this.submit();
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
   * Triggers a submit call on an ancestor form element,
   * if present.
   */
  submit() {
    const formEl = this.closest("form[data-location-search]");

    if (formEl) {
      // If there is a loader component available,
      // display it
      const loader = document.querySelector("wx-loader");
      if (loader) {
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
    if (this.ariaLiveDebounceTimer) {
      window.clearTimeout(this.ariaLiveDebounceTimer);
    }
    this.ariaLiveDebounceTimer = window.setTimeout(() => {
      Array.from(this.querySelectorAll("[slot='sr-only']")).forEach((span) =>
        span.remove(),
      );
      const span = document.createElement("span");
      span.setAttribute("slot", "sr-only");
      span.innerText = text;
      this.append(span);
    }, 1000);
  }
}

window.customElements.define("wx-combo-box-location", LocationComboBox);
