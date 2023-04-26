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

class Observation {
  constructor() {}
}

export const getValue = (prop) => {
  const startUnit = wmoToLib.get(prop.unitCode);
  const endUnit = inToOut.get(startUnit) ?? false;

  const value = prop.value;

  if (endUnit) {
    return convert(value, startUnit).to(endUnit);
  }
  return value;
};
