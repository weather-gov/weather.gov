const createOneTimeJSONP = () => {
  const name = `weathergov_${[...Array(30)]
    .map(() => Math.round(Math.random() * 36).toString(36))
    .join("")}`;

  const load = (url) =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.setAttribute("src", url);

      const jsonp = async (data) => {
        script.remove;
        delete window[name];

        resolve(data);
      };

      window[name] = jsonp;
      document.body.append(script);
    });

  return { load, name };
};

class LocationSearch {
  #_node;
  #_input;
  #_select;

  constructor(node) {
    this.#_node = node;
    this.#_input = node.querySelector("input");
    this.#_select = node.querySelector("select");

    this.#_input.addEventListener("input", this.searchChanged.bind(this));
    this.#_select.addEventListener("change", this.locationSelected.bind(this));
  }

  async locationSelected() {
    const { value } = this.#_select;
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

      window.location.href = `/point/${lat}/${long}`;
    }
  }

  async searchChanged() {
    const { value } = this.#_input;
    if (value.length >= 3) {
      const { load, name } = createOneTimeJSONP();
      const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest?f=json&countryCode=USA%2CPRI%2CVIR%2CGUM%2CASM&category=Land+Features%2CBay%2CChannel%2CCove%2CDam%2CDelta%2CGulf%2CLagoon%2CLake%2COcean%2CReef%2CReservoir%2CSea%2CSound%2CStrait%2CWaterfall%2CWharf%2CAmusement+Park%2CHistorical+Monument%2CLandmark%2CTourist+Attraction%2CZoo%2CCollege%2CBeach%2CCampground%2CGolf+Course%2CHarbor%2CNature+Reserve%2COther+Parks+and+Outdoors%2CPark%2CRacetrack%2CScenic+Overlook%2CSki+Resort%2CSports+Center%2CSports+Field%2CWildlife+Reserve%2CAirport%2CFerry%2CMarina%2CPier%2CPort%2CResort%2CPostal%2CPopulated+Place&maxSuggestions=10&_=1695666335097&text=${value}&callback=${name}`;
      const { suggestions } = await load(url);

      this.#_select.innerText = "";

      suggestions.forEach(({ text, magicKey }) => {
        const option = document.createElement("option");
        option.innerText = text;
        option.setAttribute("value", magicKey);
        this.#_select.append(option);
      });
    }
  }
}

export default () => {
  const searchers = document.querySelectorAll("[data-location-search]");
  for (const node of searchers) {
    new LocationSearch(node);
  }
};
