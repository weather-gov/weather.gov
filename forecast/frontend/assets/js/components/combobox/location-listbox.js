import Listbox from "./listbox.js";

const makeListItemFromResultItem = (data, suggestion, idx) => {
  const item = document.createElement("li");
  item.innerText = suggestion.text;
  item.setAttribute("role", "option");
  item.setAttribute("aria-setsize", data.suggestions.length);
  item.setAttribute("posinset", idx + 1);
  item.setAttribute("aria-selected", false);
  if(suggestion.magicKey){
    item.setAttribute("data-magic-key", suggestion.magicKey);
  } else if(suggestion.url){
    item.setAttribute("data-url", suggestion.url);
  } else {
    return null;
  }
  return item;
};


export default class LocationListbox extends Listbox {
  constructor(){
    super();
    
    // Bound component methods
    this.saveSearchResult = this.saveSearchResult.bind(this);
    this.updateSavedSearches = this.updateSavedSearches.bind(this);
    this.getSearchResults = this.getSearchResults.bind(this);
    this.handlePopupNav = this.handlePopupNav.bind(this);
  }

  connectedCallback(){
    super.connectedCallback();

    this.addEventListener("wx:popup-nav", this.handlePopupNav);

    // If there is a place set via attribute, we add
    // it to the saved search results
    if(this.dataset.place){
      this.saveSearchResult({
        text: this.dataset.place,
        url: window.location.pathname
      });
    }
  }

  /**
   * Override selectItem to first fetch the location data
   * (either from cache or live) for the option with the
   * given magicKey
   */
  selectItem(element){
    // For consistency, let's force even the regular calls
    // to selectItem to be wrapped as promises
    const selectItemPromise = new Promise((resolve) => {
      resolve(super.selectItem(element));
    });

    // If the incoming element is falsy, just return the
    // promise to call the super version.
    if(!element){
      return selectItemPromise;
    }

    // Otherwise, attempt to get cached/fetched
    // geographic data and add that to the option element
    // dataset/attributes.
    // This is so consumers of the change event can see the result.
    if(element.dataset.magicKey){
      return this.getGeodataForKey(element.dataset.magicKey)
        .then((geoData) => {
          if(geoData){
            element.setAttribute("data-lat", geoData.lat);
            element.setAttribute("data-lon", geoData.lon);
          }
          super.selectItem(element);
        });
    }
    
    return selectItemPromise;
  }

  /**
   * Override the handleItemsChanged slotchange event
   * handler, so that we can populate search results
   * if the consumer has added a saved searches slotted
   * group.
   */
  handleItemsChanged(event){
    this.updateSavedSearches();
    super.handleItemsChanged(event);
  }

  /**
   * For this subclass of the listbox, we want to
   * prefetch and cache location data for the magicKey
   * for any result list item. We speculatively do so
   * whenever a given item receives the pseudoFocus.
   */
  handlePopupNav(event){
    if(this.pseudoFocus){
      const key = this.pseudoFocus.dataset.value;
      this.cacheLocationGeodata(key);
    }
  }

  updateSavedSearches(){
    const savedSearchesGroup = this.querySelector(`ul[role="group"].saved-searches`);
    if(savedSearchesGroup){
      let saved = [];
      try {
        saved = JSON.parse(
          localStorage.getItem("wxgov_recent_locations") ?? "[]"
        );
      } catch(e) {
        // Swallow and work with the list
      }

      // Clear any existing search items in the element.
      // We will regenerate them.
      savedSearchesGroup.innerHTML = "";

      // If there are no saved searches, we should hide
      // the list and the label together
      if(!saved.length){
        // Try to find the label for saved elements
        if(savedSearchesGroup.previousElementSibling){
          savedSearchesGroup.previousElementSibling.classList.add("hidden");
        }
        savedSearchesGroup.classList.add("hidden");
      } else {
        if(savedSearchesGroup.previousElementSibling){
          savedSearchesGroup.previousElementSibling.classList.remove("hidden");
        }
        savedSearchesGroup.classList.remove("hidden");
      }

      saved.forEach(savedItem => {
        const element = document.createElement("li");
        element.setAttribute("role", "option");
        element.setAttribute("data-url", savedItem.url);
        element.textContent = savedItem.text;
        savedSearchesGroup.append(element);
      });
    }
  };

  saveSearchResult(obj){
    // First we need to see if there are any existing
    // items already saved in the saved searches array
    const existing = localStorage.getItem("wxgov_recent_locations");
    let items = [];
    if(existing){
      items = JSON.parse(existing);
    }

    // Now push the new items onto either an empty list
    // or the existing list, then serialize and save
    items.push(obj);
    localStorage.setItem(
      "wxgov_recent_locations",
      JSON.stringify(items)
    );
  }

  async getSearchResults(text){
    const response = await this.searchLocation(text);
    if(response.ok){
      const data = await response.json();
      return data;
    }
    return { suggestions: [] };
  }

  async filterText(text){
    const data = await this.getSearchResults(text);
    const resultListElement = this.querySelector(`ul[id="${this.id}--results"]`);
    resultListElement.remove();
    resultListElement.innerHTML = "";
    const newItems = data.suggestions.map((suggestion, idx) => {
      return makeListItemFromResultItem(data, suggestion, idx);      
    });
    resultListElement.append(...newItems);
    this.append(resultListElement);
  }

  /**
   * Asynchronously fetches specific location data
   * for a given search result, stashing it away in
   * the cache
   */
  async cacheLocationGeodata(magicKey){
    if(!window.sessionStorage.getItem(magicKey)){
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
    if(!cached){
      return this.getLocationGeodata(magicKey);
    }
    return JSON.parse(cached);
  }


  async getLocationGeodata (magicKey) {
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find?magicKey=${magicKey}&f=json&_=1695666335115`;
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    const results = await response.json();
    return this.processLocationGeodata(results);
  };

  processLocationGeodata(results){
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

  async searchLocation(text){
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json&countryCode=USA%2CPRI%2CVIR%2CGUM%2CASM&category=Land+Features%2CBay%2CChannel%2CCove%2CDam%2CDelta%2CGulf%2CLagoon%2CLake%2COcean%2CReef%2CReservoir%2CSea%2CSound%2CStrait%2CWaterfall%2CWharf%2CAmusement+Park%2CHistorical+Monument%2CLandmark%2CTourist+Attraction%2CZoo%2CCollege%2CBeach%2CCampground%2CGolf+Course%2CHarbor%2CNature+Reserve%2COther+Parks+and+Outdoors%2CPark%2CRacetrack%2CScenic+Overlook%2CSki+Resort%2CSports+Center%2CSports+Field%2CWildlife+Reserve%2CAirport%2CFerry%2CMarina%2CPier%2CPort%2CResort%2CPostal%2CPopulated+Place&maxSuggestions=10&_=1695666335097&text=${text}`;
    return fetch(url, { headers: { "Content-Type": "application/json" } });
  }
};

if(!window.customElements.get("wx-location-listbox")){
  window.customElements.define("wx-location-listbox", LocationListbox);
}
