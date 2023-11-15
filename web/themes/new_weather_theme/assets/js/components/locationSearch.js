const createOneTimeJSONP = () => {
  const name = `weathergov_${[...Array(30)]
    .map(() => Math.round(Math.random() * 36).toString(36))
    .join("")}`;

  const load = (url) =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.setAttribute("src", url);

      const jsonp = async (data) => {
        script.remove();
        delete window[name];

        resolve(data);
      };

      window[name] = jsonp;
      document.body.append(script);
    });

  return { load, name };
};

class LocationSearch {
  #input;

  #select;

  constructor(node) {
    this.#input = node.querySelector("input");
    this.#select = node.querySelector("select");

    this.#input.addEventListener("input", this.searchChanged.bind(this));
    this.#select.addEventListener("change", this.locationSelected.bind(this));
  }

  async locationSelected() {
    const { value } = this.#select;
    const { load, name } = createOneTimeJSONP();
    const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find?callback=${name}&magicKey=${value}&f=json&_=1695666335115`;

    const results = await load(url);

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
      const long = Math.round(geometry.x * 1_000) / 1_000;

      // Push the next URL into the history to preserve the current URL in the
      // browser history stack.
      window.history.pushState(null, null, `/point/${lat}/${long}`);
      window.location.href = `/point/${lat}/${long}`;
    }
  }

  async searchChanged() {
    const { value } = this.#input;
    if (value.length >= 3) {
      const { load, name } = createOneTimeJSONP();
      const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json&countryCode=USA%2CPRI%2CVIR%2CGUM%2CASM&category=Land+Features%2CBay%2CChannel%2CCove%2CDam%2CDelta%2CGulf%2CLagoon%2CLake%2COcean%2CReef%2CReservoir%2CSea%2CSound%2CStrait%2CWaterfall%2CWharf%2CAmusement+Park%2CHistorical+Monument%2CLandmark%2CTourist+Attraction%2CZoo%2CCollege%2CBeach%2CCampground%2CGolf+Course%2CHarbor%2CNature+Reserve%2COther+Parks+and+Outdoors%2CPark%2CRacetrack%2CScenic+Overlook%2CSki+Resort%2CSports+Center%2CSports+Field%2CWildlife+Reserve%2CAirport%2CFerry%2CMarina%2CPier%2CPort%2CResort%2CPostal%2CPopulated+Place&maxSuggestions=10&_=1695666335097&text=${value}&callback=${name}`;
      const { suggestions } = await load(url);

      this.#select.innerText = "";

      suggestions.forEach(({ text, magicKey }) => {
        const option = document.createElement("option");
        option.innerText = text;
        option.setAttribute("value", magicKey);
        this.#select.append(option);
      });
    }
  }
}

export default () => {
  const searchers = Array.from(
    document.querySelectorAll("[data-location-search]"),
  );

  for (let i = 0; i < searchers.length; i += 1) {
    // It's considered bad practice to create an object but not keep any
    // references to it around. But... I'm not sure I agree with that rule. The
    // objects will keep themselves alive by being attached to DOM events, and
    // once they've kicked off, they are self-contained so we don't need to
    // interact with them again.
    //
    // Anyway, I'll refactor this later to remove the class syntax, since we
    // don't actually need it.
    //
    // eslint-disable-next-line no-new
    new LocationSearch(searchers[i]);
  }
};
