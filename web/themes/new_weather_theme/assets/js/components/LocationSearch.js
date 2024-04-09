class LocationSearch extends HTMLElement {
  constructor(){
    super();

    // The timeout will be used to prevent
    // concurrent fetches in rapid succession,
    // in particular when users are typing
    // quickly in the search box.
    this._timeout = null;
    this.INPUT_WAIT_MS = 100;

    // Bind component methods
    this.handleInput = this.handleInput.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSearchChanged = this.handleSearchChanged.bind(this);
    this.goToLocationPage = this.goToLocationPage.bind(this);
  }

  connectedCallback(){
    // Ensure that we have the basic
    // USWDS combo box class(es) added
    this.classList.add("usa-combo-box");

    // Add the event listeners we care about
    this.addEventListener("input", this.handleInput);
    this.addEventListener("change", this.handleChange);
  }

  /**
   * Wrap the request for new data
   * in a setTimeout (and clear any existing
   * timeouts, preventing them from executing),
   * so that we do not make rapid requests with each
   * keystroke that the user makes in the search
   * field.
   */
  handleInput(event){
    if(this._timeout){
      window.clearTimeout(this._timeout);
    }
    this._timeout = window.setTimeout(() => {
      this.handleSearchChanged(event);
    }, this.INPUT_WAIT_MS);
  }

  async handleSearchChanged(event){
    // We only care about input elements with the
    // id that we've specified in the template.
    if (event.target.id !== "weather-location-search") {
      return;
    }
    const { value } = event.target;

    // The select element is a sibling to this input.
    const selectElement = event.target.parentElement.querySelector("select");

    if (value.length >= 3) {
      const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json&countryCode=USA%2CPRI%2CVIR%2CGUM%2CASM&category=Land+Features%2CBay%2CChannel%2CCove%2CDam%2CDelta%2CGulf%2CLagoon%2CLake%2COcean%2CReef%2CReservoir%2CSea%2CSound%2CStrait%2CWaterfall%2CWharf%2CAmusement+Park%2CHistorical+Monument%2CLandmark%2CTourist+Attraction%2CZoo%2CCollege%2CBeach%2CCampground%2CGolf+Course%2CHarbor%2CNature+Reserve%2COther+Parks+and+Outdoors%2CPark%2CRacetrack%2CScenic+Overlook%2CSki+Resort%2CSports+Center%2CSports+Field%2CWildlife+Reserve%2CAirport%2CFerry%2CMarina%2CPier%2CPort%2CResort%2CPostal%2CPopulated+Place&maxSuggestions=10&_=1695666335097&text=${value}`;
      const response = await fetch(url, {headers: {'Content-Type': 'application/json'}});
      const { suggestions } = await response.json();

      selectElement.innerText = "";

      suggestions.forEach(({ text, magicKey }) => {
        const option = document.createElement("option");
        option.innerText = text;
        option.setAttribute("value", magicKey);
        selectElement.append(option);
      });
    }
  }

  async handleChange (event){
    // We only care about change events that have
    // come from select elements with the "weather location"
    // name.
    // Note that we cannot use the id here, because USWDS strips it,
    // giving the input element it inserts that id value instead
    if (!event.target.getAttribute("name") === "weather location") {
      return;
    }
    const { value } = event.target;
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find?magicKey=${value}&f=json&_=1695666335115`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': "application/json"
      }
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

      const placeName = event.target.selectedOptions[0].innerText;

      this.goToLocationPage(lat, lon, placeName);
    }
  }

  goToLocationPage(latitude, longitude, placename){
    // We want to redirect the user via a POST. We already have the form ready to
    // go, we just need to set its action so the browser knows where to go.
    const form = document.querySelector("form[data-location-search]");
    form.setAttribute("action", `/point/${latitude}/${longitude}`);

    // If we also have a suggested place name, add that to the form.
    if (placename) {
      const suggestion = form.querySelector(`input[name="suggestedPlaceName"]`);
      suggestion.setAttribute("value", placename);
    }

    form.submit();
  }
}

window.customElements.define("wx-location-search", LocationSearch);
