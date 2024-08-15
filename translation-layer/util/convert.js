import convert from "convert";

const unitMapping = new Map([
  [
    "wmoUnit:degC",
    {
      in: { name: "celsius", label: "degC" },
      out: [{ name: "fahrenheit", label: "degF" }],
    },
  ],
  [
    "wmoUnit:degF",
    {
      in: { name: "fahrenheit", label: "degF" },
      out: [{ name: "celsius", label: "degC" }],
    },
  ],
  [
    "wmoUnit:km_h-1",
    {
      in: { name: "km", label: "km/h" },
      out: [{ name: "miles", label: "mph" }],
    },
  ],
  [
    "wxgov:mph",
    {
      in: { name: "miles", label: "mph" },
      out: [{ name: "km", label: "km/h" }],
    },
  ],
  [
    "wmoUnit:degree_(angle)",
    { in: { name: "degrees", label: "degrees" }, out: [] },
  ],
  ["wmoUnit:percent", { in: { name: "percent", label: "percent" }, out: [] }],
  [
    "wmoUnit:Pa",
    {
      in: { name: "pascal", label: "pa" },
      out: [
        { name: "millibar", label: "mb" },
        { convert: (v) => v / 3386.38, label: "inHg" },
      ],
    },
  ],
  [
    "wmoUnit:mm",
    {
      in: { name: "millimeters", label: "mm" },
      out: [{ name: "inches", label: "in" }],
    },
  ],
  [
    "wmoUnit:m",
    {
      in: { name: "meters", label: "m" },
      out: [
        { name: "feet", label: "ft" },
        { name: "miles", label: "mi" },
      ],
    },
  ],
]);

export const convertProperties = (obj) => {
  let unitKey = "unitCode";

  const keys = Object.keys(obj).filter((key) => {
    if (unitMapping.has(obj[key].unitCode)) {
      return true;
    }
    if (unitMapping.has(obj[key].uom)) {
      unitKey = "uom";
      return true;
    }
    return false;
  });

  for (const key of keys) {
    const prop = obj[key];
    const conversion = unitMapping.get(prop[unitKey]);
    const value = obj[key].value;

    obj[key] = { [conversion.in.label]: value };

    for (const out of conversion.out) {
      if (value === null) {
        obj[key][out.label] = null;
      } else if (out.convert) {
        obj[key][out.label] = out.convert(value);
      } else {
        obj[key][out.label] = convert(value, conversion.in.name).to(out.name);
      }
    }
  }

  return obj;
};

export default { convertProperties };
