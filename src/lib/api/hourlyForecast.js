import convert from "https://cdn.jsdelivr.net/npm/convert@4";

const wmoToLib = new Map([
  ["F", "fahrenheit"],
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

const getValueInExpectedUnits = (prop) => {
  const startUnit = wmoToLib.get(prop.unitCode);
  const endUnit = inToOut.get(startUnit) ?? false;

  const value = prop.value;

  if (endUnit) {
    return convert(value, startUnit).to(endUnit);
  }
  return value;
};

class HourlyForecastHour {
  #hourlyData;
  #temperature = { value: 0, unitCode: "F" };
  #timeEnd;
  #timeStart;

  constructor(hourlyData) {
    this.#hourlyData = hourlyData;
    this.#temperature.value = hourlyData.temperature;
    this.#temperature.unitCode = hourlyData.temperatureUnit;

    this.#timeEnd = new Date(Date.parse(hourlyData.endTime));
    this.#timeStart = new Date(Date.parse(hourlyData.startTime));
  }

  get precipitationProbability() {
    return getValueInExpectedUnits(this.#hourlyData.probabilityOfPrecipitation);
  }

  get temperature() {
    return getValueInExpectedUnits(this.#temperature);
  }

  get valid() {
    const end = this.#timeEnd;
    const start = this.#timeStart;

    return {
      end,
      start,
    };
  }
}

export class HourlyForecast {
  #hours;
  #timestamp;

  constructor(forecast) {
    this.#timestamp = forecast.updated;

    this.#hours = forecast.periods.map((hour) => new HourlyForecastHour(hour));
  }

  get hours() {
    return this.#hours;
  }

  get timestamp() {
    return this.#timestamp;
  }

  static async load(url) {
    const forecast = await fetch(url).then((r) => r.json());
    return new HourlyForecast(forecast.properties);
  }
}
