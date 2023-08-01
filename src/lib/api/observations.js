import convert from "https://cdn.jsdelivr.net/npm/convert@4";

// equatorial mean radius of Earth (in miles)
const R = 3_963.19;

function toRad(x) {
  return (x * Math.PI) / 180.0;
}
function hav(x) {
  return Math.sin(x / 2) ** 2;
}

function haversineDistance(a, b) {
  const aLat = toRad(a.latitude);
  const bLat = toRad(b.latitude);
  const aLng = toRad(a.longitude);
  const bLng = toRad(b.longitude);

  const ht =
    hav(bLat - aLat) + Math.cos(aLat) * Math.cos(bLat) * hav(bLng - aLng);
  return 2 * R * Math.asin(Math.sqrt(ht));
}

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
  #lat;
  #lng;
  #elevation;

  constructor(
    { code: station, name: stationName, coords: [lng, lat, elevation] },
    obs
  ) {
    this.#station = station;
    this.#stationName = stationName;
    this.#obs = obs;
    this.#timestamp = new Date(Date.parse(obs.timestamp));
    this.#lat = lat;
    this.#lng = lng;
    this.elevation = elevation;
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

  distanceFrom(lat, lng, elevation) {
    return haversineDistance(
      { latitude: lat, longitude: lng },
      {
        latitude: this.#lat,
        longitude: this.#lng,
      }
    );
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

    const stationMetadataPromise = fetch(stationUrl)
      .then((r) => r.json())
      .then((meta) => ({
        name: meta.properties.name,
        coords: [...meta.geometry.coordinates, meta.properties.elevation.value],
      }));

    const observationsPromise = fetch(`${stationUrl}/observations/latest`)
      .then((r) => r.json())
      .then((meta) => meta.properties);

    const [stationMetadata, observations] = await Promise.all([
      stationMetadataPromise,
      observationsPromise,
    ]);

    const station = { ...stationMetadata, code: stationCode };

    return new Observation(station, observations);
  }
}
