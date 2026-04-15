import Listbox from "./listbox.js";
import { getSavedLocations, addSavedLocation } from "../saved-locations.js";
import Timer from "../timer.js";

const debouncer = new Timer();

/**
 * @typedef {Object} Suggestion from geocode.arcgis.com
 * @property {boolean} isCollection
 * @property {string} magicKey
 * @property {string} text the human-readable location name
 */

/**
 * @typedef {Object} SavedLocation from local storage
 * @property {string} url the point forecast url for the location
 * @property {string} text the human-readable location name
 */

/**
 * Helper function. Creates an `li` element for a given choice.
 *
 * @param {number} setSize the number of results in the list
 * @param {string|undefined} describedby the id of the element which describes the list (optional)
 * @param {Suggestion|SavedLocation} suggestion the data for this item
 * @param {number} idx the item's position in the list
 * */
const makeListItemFromResultItem = (setSize, describedby, suggestion, idx) => {
  const item = document.createElement("li");
  item.innerText = suggestion.text;
  item.setAttribute("role", "option");
  item.setAttribute("aria-setsize", setSize);
  item.setAttribute("posinset", idx + 1);
  item.setAttribute("aria-selected", false);
  if (describedby) {
    item.setAttribute("aria-describedby", describedby);
  }
  if (suggestion.magicKey) {
    item.setAttribute("data-magic-key", suggestion.magicKey);
  } else if (suggestion.url) {
    item.setAttribute("data-url", suggestion.url);
  } else {
    return null;
  }
  return item;
};

/**
 * Given a `ul` for location search results, create all the child `li`s.
 *
 * @param {HTMLElement} resultListElement the container for the result list
 * @param {HTMLElement|undefined} ariaDescEl the element which describes the list (optional)
 * @param {Array<Suggestion|SavedLocation>} suggestions
 */
const makeListFromResult = (resultListElement, ariaDescEl, suggestions) => {
  resultListElement.innerHTML = "";
  const setSize = suggestions.length;
  const describedby = ariaDescEl.id;
  const newItems = suggestions.map((suggestion, idx) => {
    return makeListItemFromResultItem(setSize, describedby, suggestion, idx);
  });
  resultListElement.append(...newItems);
};

export default class LocationListbox extends Listbox {
  constructor() {
    super();

    // Private property defaults
    this.inputDelay = 250;

    // Bound component methods
    this.updateSavedSearches = this.updateSavedSearches.bind(this);
    this.getSearchResults = this.getSearchResults.bind(this);
    this.handlePopupNav = this.handlePopupNav.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener("wx:popup-nav", this.handlePopupNav);

    // If there is a place set via attribute, we add
    // it to the saved search results
    if (this.dataset.place) {
      addSavedLocation({
        text: this.dataset.place,
        url: window.location.pathname,
      });
    }
    this.updateSavedSearches();
  }

  /**
   * Override selectItem to first fetch the location data
   * (either from cache or live) for the option with the
   * given magicKey
   */
  selectItem(element) {
    // For consistency, let's force even the regular calls
    // to selectItem to be wrapped as promises
    const selectItemPromise = new Promise((resolve) => {
      resolve(super.selectItem(element));
    });

    // If the incoming element is falsy, just return the
    // promise to call the super version.
    if (!element) {
      return selectItemPromise;
    }

    // Otherwise, if the option's data-url attribute exists, use that.
    if (element.getAttribute("data-url")) {
      return new Promise((resolve) => {
        if (this.getAttribute("auto-submit") === "true") {
          addSavedLocation({
            text: element.innerText,
            url: element.getAttribute("data-url"),
          });
          const form = this.closest("form[data-location-search]");
          form.setAttribute("action", element.getAttribute("data-url"));
          form.submit();
          // Show the loader animation, if available
          window.dispatchEvent(
            new CustomEvent("wx-show-navigation-loader", {
              detail: { id: this.getAttribute("id") },
            }),
          );
        }

        resolve(super.selectItem(element));
      });
    }

    // Otherwise, attempt to get cached/fetched
    // geographic data and add that to the option element
    // dataset/attributes.
    // This is so consumers of the change event can see the result.
    if (element.dataset.magicKey) {
      return this.getGeodataForKey(element.dataset.magicKey).then((geoData) => {
        if (geoData) {
          element.setAttribute("data-lat", geoData.lat);
          element.setAttribute("data-lon", geoData.lon);
          if (this.getAttribute("auto-submit") === "true") {
            const formUrl = `/point/${geoData.lat}/${geoData.lon}`;
            addSavedLocation({
              text: element.innerText,
              url: formUrl,
            });
            const form = this.closest("form[data-location-search]");
            form.setAttribute("action", formUrl);
            form.submit();
            // Show the loader animation, if available
            window.dispatchEvent(
              new CustomEvent("wx-show-navigation-loader", {
                detail: { id: this.getAttribute("id") },
              }),
            );
          }
        }
        super.selectItem(element);
      });
    }

    return selectItemPromise;
  }

  /**
   * For this subclass of the listbox, we want to
   * prefetch and cache location data for the magicKey
   * for any result list item. We speculatively do so
   * whenever a given item receives the pseudoFocus.
   */
  handlePopupNav(event) {
    if (this.pseudoFocus) {
      const key = this.pseudoFocus.dataset.value;
      this.cacheLocationGeodata(key);
    }
  }

  /**
   * Retrieve saved locations from local storage and
   * insert them into the popup, filtering first by
   * `filterTerm` if one is given.
   */
  updateSavedSearches(filterTerm) {
    const savedSearchesGroup = this.querySelector(
      '[role="group"].saved-searches',
    );
    const savedSearchesLabel = this.querySelector(
      '[role="heading"].saved-searches',
    );
    if (savedSearchesGroup) {
      let saved = getSavedLocations();

      // Clear any existing search items in the element.
      // We will regenerate them.
      savedSearchesGroup.innerHTML = "";

      if (filterTerm) {
        const match = filterTerm.toLowerCase();
        saved = saved.filter((option) =>
          option.text.toLowerCase().includes(match),
        );
      }

      // If there are no saved searches, we should hide
      // the list and the label together
      if (!saved.length) {
        savedSearchesLabel?.classList?.add?.("hidden");
        savedSearchesGroup.classList.add("hidden");
      } else {
        savedSearchesLabel?.classList?.remove?.("hidden");
        savedSearchesGroup.classList.remove("hidden");
        makeListFromResult(savedSearchesGroup, savedSearchesLabel, saved);
      }
    }
  }

  async getSearchResults(text) {
    const response = await this.searchLocation(text);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return { suggestions: [] };
  }

  /** Announce updated search results in an Aria live region. */
  announceResults() {
    const numResults = this.querySelectorAll("li").length;
    const translation = ngettext(
      "js.location-combo-box.aria.search-updated.01",
      "js.location-combo-box.aria.search-updated.01-plural",
      numResults,
    );
    const transWithCount = interpolate(translation, [numResults]);
    window.dispatchEvent(
      new CustomEvent("wx-announce", {
        detail: { text: transWithCount, delay: 0 },
      }),
    );
  }

  async filterText(text) {
    debouncer.start(async () => {
      const data = await this.getSearchResults(text);
      const resultListElement = this.querySelector(
        '[role="group"].data-results',
      );
      const headerElement = this.querySelector('[role="heading"].data-results');
      if (resultListElement) {
        resultListElement.remove();
        makeListFromResult(resultListElement, headerElement, data.suggestions);
        this.append(resultListElement);
      }
      this.updateSavedSearches(text);
      this.announceResults();
    }, this.inputDelay);
  }

  /**
   * Asynchronously fetches specific location data
   * for a given search result, stashing it away in
   * the cache
   */
  async cacheLocationGeodata(magicKey) {
    if (!window.sessionStorage.getItem(magicKey)) {
      const result = await this.getLocationGeodata(magicKey);
      window.sessionStorage.setItem(magicKey, JSON.stringify(result));
    }
  }

  /**
   * Attempts to retrieve location data for a search
   * result by its magicKey from the cache.
   * If not present, will make the Arc API call
   * to fetch the data.
   */
  async getGeodataForKey(magicKey) {
    const cached = window.sessionStorage.getItem(magicKey);
    if (!cached) {
      return this.getLocationGeodata(magicKey);
    }
    return JSON.parse(cached);
  }

  async getLocationGeodata(magicKey) {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find?magicKey=${magicKey}&f=json&_=1695666335115`;
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    const results = await response.json();
    return this.processLocationGeodata(results);
  }

  processLocationGeodata(results) {
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
  }

  async searchLocation(text) {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json&countryCode=USA%2CPRI%2CVIR%2CGUM%2CASM&category=Land+Features%2CBay%2CChannel%2CCove%2CDam%2CDelta%2CGulf%2CLagoon%2CLake%2COcean%2CReef%2CReservoir%2CSea%2CSound%2CStrait%2CWaterfall%2CWharf%2CAmusement+Park%2CHistorical+Monument%2CLandmark%2CTourist+Attraction%2CZoo%2CCollege%2CBeach%2CCampground%2CGolf+Course%2CHarbor%2CNature+Reserve%2COther+Parks+and+Outdoors%2CPark%2CRacetrack%2CScenic+Overlook%2CSki+Resort%2CSports+Center%2CSports+Field%2CWildlife+Reserve%2CAirport%2CFerry%2CMarina%2CPier%2CPort%2CResort%2CPostal%2CPopulated+Place&maxSuggestions=10&_=1695666335097&text=${text}`;
    return fetch(url, { headers: { "Content-Type": "application/json" } });
  }
}

if (!window.customElements.get("wx-location-listbox")) {
  window.customElements.define("wx-location-listbox", LocationListbox);
}
