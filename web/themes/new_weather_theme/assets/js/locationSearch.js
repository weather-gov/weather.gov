// The number of milliseconds to delay
// before triggering the field's input
// handler. This prevents us from triggering
// requests for every keystroke when the user
// is typing rapidly.
const INPUT_WAIT_MS = 100;

class LocationSearchWrapper {
  constructor(){
    this._timeout = null;

    // Bind instance methods
    this.handleLocationSelected = this.handleLocationSelected.bind(this);
    this.enqueueSearchChanged = this.enqueueSearchChanged.bind(this);
    this.handleSearchChanged = this.handleSearchChanged.bind(this);
    this.goToLocationPage = this.goToLocationPage.bind(this);

    // Bind the appropriate event handlers to
    // the wrapped element
    document.addEventListener("input", this.enqueueSearchChanged);
    document.addEventListener("change", this.handleLocationSelected);
  }

  async handleLocationSelected (event){
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

  enqueueSearchChanged(event){
    if(this._timeout){
      window.clearTimeout(this._timeout);
    }
    this._timeout = window.setTimeout(() => {
      this.handleSearchChanged(event);
    }, INPUT_WAIT_MS);
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

const LocationSearchWrapper2 = {
  _timeout: null,
  enqueueSearchChanged: (event) => {
    if(this._timeout){
      window.clearTimeout(this._timeout);
    }
    this._timeout = window.setTimeout(() => {
      this.handleSearchChanged(event);
    }, INPUT_WAIT_MS);
  },
  handleLocationSelected: async (event) => {
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
  },

  handleSearchChanged: async (event) => {
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
  },

  goToLocationPage: (latitude, longitude, placename) => {
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
  },
  start: () => {
    // USWDS inserts an <input> element into the combo-box,
    // but we do not have control over when that happens.
    // This prevents us from reliably adding event listeners to
    // that element.
    // Instead, we wait for the events we care about to bubble
    // up to the document and filter by attributes, ensuring
    // we act on the location input combo box only.
    document.addEventListener("input", this.enqueueSearchChanged);
    document.addEventListener("change", this.handleLocationSelected);
    console.log(this);
  },
  stop: () => {
    document.removeEventListener("input", this.enqueueSearchChanged);
    document.removeEventListener("change", this.handleLocationSelected);
  }
};

(() => {
  const goToLocationPage = (latitude, longitude, placename) => {
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
  };

  const setupBrowserGeolocation = async () => {
    const button = document.querySelector(
      "button#weathergov-use-browser-location",
    );

    // If the browser does not support the geolocation API, just bail out. Take
    // the "use my location" button away too. Also bop out if we don't have a
    // button for some reason. Just being safe.
    if (!button || !navigator.geolocation) {
      button?.parentElement?.previousElementSibling.remove();
      button?.parentElement?.remove();

      return;
    }

    // Whether we should independently prompt the user prior to asking the browser
    // for their location. IF we can detect existing permissions AND the user has
    // not already granted or denied us, THEN we should prompt first. If we can't
    // detect existing permissions, don't prompt because otherwise we end up
    // putting up our prompt for that user every time they try to use their
    // location.
    let shouldPrompt = false;

    if (navigator.permissions) {
      try {
        // Query for geolocation permissions.
        const status = await navigator.permissions.query({
          name: "geolocation",
        });

        // If the user has already denied location, we can go ahead and bail out.
        // Changing browser settings is not detectable within the page, so they'll
        // have to reload to get the option back anyway.
        //
        // Might need to reconsider this. It might be preferable to leave the
        // button and show users a popup. There are several reasons we might get
        // the "denied" state:
        //
        // 1. The web browser does not have permission from the operating system.
        // 2. The web browser is configured to deny permission by default.
        // 3. The user has denied access to our site in particular.
        //
        // In cases 1 and 2, users may not be aware of their settings. If we show
        // the button and then popup a message when they click it letting them
        // know they need to change their browser settings, maybe that's useful.
        // The immediate drawback I can think of is we have no way of knowing
        // whether it's a browser setting or an operating system setting, so we
        // can't give them any more helpful advice than "check your settings."
        //
        // In case 3, however, we should just leave the user alone. They have
        // already said no, and that should be the end of it.
        //
        // Key important takeaway, though, is that "denied" means all of those
        // things and it is impossible for us to know which.
        if (status.state === "denied") {
          button.parentElement.previousElementSibling.remove();
          button.parentElement.remove();
          return;
        }

        // If the user has not denied us permission, then we should show our own
        // prompt if the user has not yet granted us permission.
        shouldPrompt = status.state === "prompt";
      } catch (_) {
        // An exception in the permissions API likely indicates that the specific
        // attribute we queried for isn't available. That doesn't mean the feature
        // doesn't exist, though, so we should continue as if the permissions API
        // doesn't exist at all and not use our prompt.
      }
    }

    button.addEventListener("click", async () => {
      let proceed = true;

      // If location is available and we know that the user has neither denied or
      // granted us permission to use it, we will let them know before asking for
      // it. It's kind of a double-opt-in.
      if (shouldPrompt) {
        // Not sure why eslint doesn't want us to use confirm(). This seems like
        // exactly what it exists for.
        // eslint-disable-next-line no-alert
        proceed = window.confirm(
          "We will now ask your browser to provide your location. If you approve, you will not be asked again. Your location information is only used to find your forecast.",
        );
      }

      // If we don't know about the permission, we were already approved to use
      // it, or the user has signaled that we can ask for it... ask for it!
      if (proceed) {
        navigator.geolocation.getCurrentPosition(
          // Success callback
          ({ coords: { latitude, longitude } }) => {
            // Scale down the precision on these.
            const lat = Math.round(latitude * 1_000) / 1_000;
            const long = Math.round(longitude * 1_000) / 1_000;

            // And navigate away!
            goToLocationPage(lat, long);
          },
          // Error callback
          ({ code, message }) => {
            if (code > 1) {
              // There was a problem getting the user's location. They allowed it,
              // but the browser gave us an error.
              // (Error code 1 is for when the user denies access to location, so
              // for our purposes, that is not an error.)

              // eslint-disable-next-line no-alert
              alert(
                `There was a problem getting your location. Here's what your browser told us: ${message}`,
              );
            }
          },
        );
      }
    });
  };
  LocationSearchWrapper2.start();
  setupBrowserGeolocation();
})();
