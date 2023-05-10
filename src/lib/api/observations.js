import convert from "https://cdn.jsdelivr.net/npm/convert@4";

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

export class Observation {
  #station;
  #stationName;
  #obs;
  #timestamp;

  constructor(station, stationName, obs) {
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
  get station() {
    return this.#station;
  }

  get stationName() {
    return this.#stationName;
  }

  get timestamp() {
    return this.#timestamp;
  }

  //////////////////////////////////////////////////////////////////////////////
  // The observations themselves
  get temperature() {
    return Math.round(this.#getValue(this.#obs.temperature));
  }

  get text() {
    return this.#obs.textDescription;
  }

  static async load(url) {
    const stationUrl = await fetch(url)
      .then((r) => r.json())
      .then((list) => list.observationStations.shift());

    const stationCode = stationUrl.split("/").pop();

    const stationNamePromise = fetch(stationUrl)
      .then((r) => r.json())
      .then((meta) => meta.properties.name);

    const observationsPromise = fetch(`${stationUrl}/observations?limit=1`)
      .then((r) => r.json())
      .then((meta) => meta.features[0].properties);

    const [stationName, observations] = await Promise.all([
      stationNamePromise,
      observationsPromise,
    ]);

    return new Observation(stationCode, stationName, observations);
  }
}
