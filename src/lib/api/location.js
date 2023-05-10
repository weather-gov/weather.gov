import { Observation } from "./observations.js";
import { HourlyForecast } from "./hourlyForecast.js";

class MetaURLs {
  #meta;
  constructor(meta) {
    this.#meta = meta.properties;
  }

  get fireWeatherZone() {
    return this.#meta.fireWeatherZone;
  }

  get forecast() {
    return this.#meta.forecast;
  }

  get forecastGridData() {
    return this.#meta.forecastGridData;
  }

  get forecastHourly() {
    return this.#meta.forecastHourly;
  }

  get forecaseOffice() {
    return this.#meta.forecastOffice;
  }

  get forecastZone() {
    return this.#meta.forecastZone;
  }

  get observationStations() {
    return this.#meta.observationStations;
  }
}

class LocationMeta {
  #lat;
  #lng;
  #ready;
  #json;
  #urls;

  #hourlyForecast = false;
  #observations = false;

  constructor(latitude, longitude) {
    this.#lat = Math.round(latitude * 1000) / 1000;
    this.#lng = Math.round(longitude * 1000) / 1000;

    const metaUrl = `https://api.weather.gov/points/${this.#lat},${this.#lng}`;
    this.#ready = fetch(metaUrl)
      .then((r) => r.json())
      .then((json) => {
        this.#json = json;
        this.#urls = new MetaURLs(json);
      });
  }

  get ready() {
    return this.#ready;
  }

  get grid() {
    return { x: this.#json?.properties.gridX, y: this.#json?.properties.gridX };
  }

  get place() {
    const { city, state } = this.#json?.properties.relativeLocation.properties;
    return `${city}, ${state}`;
  }

  get urls() {
    return this.#urls;
  }

  get wfo() {
    return this.#json?.properties.cwa;
  }

  ////// load data based on location metadata //////////////////////////////////
  get hourlyForecast() {
    return this.#ready.then(async () => {
      if (!this.#hourlyForecast) {
        this.#hourlyForecast = await HourlyForecast.load(
          this.urls.forecastHourly
        );
      }
      return this.#hourlyForecast;
    });
  }

  get observations() {
    return this.#ready.then(async () => {
      if (!this.#observations) {
        this.#observations = await Observation.load(
          this.urls.observationStations
        );
      }
      return this.#observations;
    });
  }

  static async from(latitude, longitude) {
    const meta = new LocationMeta(latitude, longitude);
    await meta.ready;

    return meta;
  }
}

export const getFromLocation = LocationMeta.from;
