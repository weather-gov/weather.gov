import convert from "https://cdn.jsdelivr.net/npm/convert@4";
import log from "./log.js";

const wmoToLib = new Map([
  ["wmoUnit:degC", "celsius"],
  ["wmoUnit:degree_(angle)", "degrees"],
  ["wmoUnit:m", "m"],
  ["wmoUnit:mm", "mm"],
  ["wmoUnit:km_h-1", "km"],
  ["wmoUnit:Pa", "pascal"],
]);

const inToOut = new Map([
  ["celsius", "fahrenheit"],
  ["m", "foot"],
  ["mm", "inch"],
  ["km", "mile"],
  ["pascal", "bar"],
]);

class Observation {
  #wfo;
  #place;
  #station;
  #stationName;
  #obs;
  #timestamp;

  constructor(wfo, place, station, stationName, obs) {
    this.#wfo = wfo;
    this.#place = place;
    this.#station = station;
    this.#stationName = stationName;
    this.#obs = obs;
    this.#timestamp = new Date(Date.parse(obs.timestamp));
  }

  /**
   * @param {Object} prop A single property from an observation with units and a
   *                      value.
   * @returns The value of the requested property, converted from its input
   *          units into output units.
   */
  #getValue(prop) {
    const startUnit = wmoToLib.get(prop.unitCode);
    const endUnit = inToOut.get(startUnit) ?? false;

    const value = prop.value;

    if (endUnit) {
      return convert(value, startUnit).to(endUnit);
    }
    return value;
  }

  //////////////////////////////////////////////////////////////////////////////
  // The bits that describe where the observation comes from.
  get place() {
    return this.#place;
  }

  get station() {
    return this.#station;
  }

  get stationName() {
    return this.#stationName;
  }

  get timestamp() {
    return this.#timestamp;
  }

  get wfo() {
    return this.#wfo;
  }

  //////////////////////////////////////////////////////////////////////////////
  // The observations themselves
  get temperature() {
    return Math.round(this.#getValue(this.#obs.temperature));
  }
}

export default async (latitude, longitude) => {
  const lat = Math.round(latitude * 1000) / 1000;
  const lng = Math.round(longitude * 1000) / 1000;

  log(`[obs] Getting observations for: ${lat}, ${lng}`);

  log("[obs] Fetching location metadata...");
  const metaUrl = `https://api.weather.gov/points/${lat},${lng}`;
  const meta = await fetch(metaUrl).then((r) => r.json());
  const place = `${meta.properties.relativeLocation.properties.city}, ${meta.properties.relativeLocation.properties.state}`;
  log(`[obs] > WFO: ${meta.properties.cwa}`);
  log(`[obs] > place: ${place}`);

  log("[obs] Fetching observation stations...");
  const stations = await fetch(meta.properties.observationStations).then((r) =>
    r.json()
  );
  const stationUrl = stations.observationStations[0];
  const station = stationUrl.split("/").pop();
  log(`[obs] > ${station} is first`);

  log("[obs] Getting station metadata...");
  const stationName = fetch(stationUrl)
    .then((r) => r.json())
    .then((meta) => {
      log(`[obs] > station: ${meta.properties.name}`);
      return meta.properties.name;
    });

  log("[obs] Fetching observations...");
  const observations = fetch(`${stationUrl}/observations`)
    .then((r) => r.json())
    .then((observations) => {
      log("[obs] > got observations");
      return observations.features[0].properties;
    });

  return new Observation(
    meta.properties.cwa,
    place,
    station,
    await stationName,
    await observations
  );
};
