import convert from "convert";

const cardinalLong = [
  "north",
  "northeast",
  "east",
  "southeast",
  "south",
  "southwest",
  "west",
  "northwest",
  "north",
];
const cardinalShort = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];

const unitMapping = new Map([
  [
    "wmoUnit:degC",
    {
      in: { name: "celsius", label: "degC", decimals: 0 },
      out: [{ name: "fahrenheit", label: "degF", decimals: 0 }],
    },
  ],
  [
    "wmoUnit:degF",
    {
      in: { name: "fahrenheit", label: "degF", decimals: 0 },
      out: [{ name: "celsius", label: "degC", decimals: 0 }],
    },
  ],
  [
    "wmoUnit:km_h-1",
    {
      in: { name: "km", label: "km/h", decimals: 0 },
      out: [{ name: "miles", label: "mph", decimals: 0 }],
    },
  ],
  [
    "wxgov:mph",
    {
      in: { name: "miles", label: "mph", decimals: 0 },
      out: [{ name: "km", label: "km/h", decimals: 0 }],
    },
  ],
  [
    "wmoUnit:degree_(angle)",
    {
      in: { name: "degrees", label: "degrees", decimals: 0 },
      out: [
        {
          convert: (v) => {
            // 1. Whatever degrees we got from the API, constrain it to 0°-360°.
            // 2. Add 22.5° to it. This accounts for north starting at -22.5°
            // 3. Use integer division by 45° to see which direction index this is.
            // This indexes into the two direction name arrays above.
            const index = Math.floor(((v % 360) + 22.5) / 45);
            return cardinalShort[index];
          },
          label: "cardinalShort",
          decimals: 0,
        },
        {
          convert: (v) => {
            // 1. Whatever degrees we got from the API, constrain it to 0°-360°.
            // 2. Add 22.5° to it. This accounts for north starting at -22.5°
            // 3. Use integer division by 45° to see which direction index this is.
            // This indexes into the two direction name arrays above.
            const index = Math.floor(((v % 360) + 22.5) / 45);
            return cardinalLong[index];
          },
          label: "cardinalLong",
          decimals: 0,
        },
      ],
    },
  ],
  [
    "wmoUnit:percent",
    { in: { name: "percent", label: "percent", decimals: 0 }, out: [] },
  ],
  [
    "wmoUnit:Pa",
    {
      in: { name: "pascal", label: "pa", decimals: 0 },
      out: [
        { name: "millibar", label: "mb", decimals: 0 },
        { convert: (v) => v / 3386.38, label: "inHg", decimals: 2 },
      ],
    },
  ],
  [
    "wmoUnit:mm",
    {
      in: { name: "millimeters", label: "mm", decimals: 2 },
      out: [{ name: "inches", label: "in", decimals: 2 }],
    },
  ],
  [
    "wmoUnit:m",
    {
      in: { name: "meters", label: "m", decimals: 0 },
      out: [
        { name: "feet", label: "ft", decimals: 0 },
        { name: "miles", label: "mi", decimals: 0 },
      ],
    },
  ],
]);

const round = (value, { decimals }) => {
  if (Number.isNaN(+value)) {
    return value;
  }

  const multiple = 10 ** decimals;
  return Math.round(value * multiple) / multiple;
};

export const convertProperties = (obj) => {
  let unitKey = "unitCode";

  const keys = Object.keys(obj).filter((key) => {
    if (unitMapping.has(obj[key]?.unitCode)) {
      return true;
    }
    if (unitMapping.has(obj[key]?.uom)) {
      unitKey = "uom";
      return true;
    }
    return false;
  });

  for (const key of keys) {
    const prop = obj[key];
    const conversion = unitMapping.get(prop[unitKey]);
    const value = obj[key].value;

    obj[key] = { [conversion.in.label]: round(value, conversion.in) };

    for (const out of conversion.out) {
      if (value === null) {
        obj[key][out.label] = null;
      } else if (out.convert) {
        obj[key][out.label] = out.convert(value);
      } else {
        obj[key][out.label] = convert(value, conversion.in.name).to(out.name);
      }

      obj[key][out.label] = round(obj[key][out.label], out);
    }
  }

  return obj;
};

export default { convertProperties };
