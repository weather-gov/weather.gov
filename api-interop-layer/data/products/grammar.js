import { readFileSync } from "node:fs";
import * as ohm from "ohm-js";

const base = ohm.grammars(
  readFileSync(new URL("./product.ohm", import.meta.url), "utf8"),
);

// Grammar from an .ohm file that extends Product
export const loadGrammar = (url) =>
  ohm.grammar(readFileSync(url, "utf8"), base);

// All or nothing, any mismatch throws with the line and column Ohm stopped at
export const matchProduct = (grammar, text, rule = "product") => {
  const match = grammar.match(text, rule);
  if (match.failed()) {
    throw new Error(match.shortMessage);
  }
  return match;
};

// Product rule actions for a parse operation, ugcLine expands to zone ids carrying the prefix
export const productActions = {
  ugcLine(first, _firstDash, zones, _dashes, _purge, _dash, _eol) {
    let prefix;
    return [first, ...zones.children].flatMap((zone) => {
      const range = zone.parse();
      prefix = range.prefix ?? prefix;

      const ids = [];
      for (let id = range.from; id <= range.to; id += 1) {
        ids.push(`${prefix}${String(id).padStart(3, "0")}`);
      }
      return ids;
    });
  },
  prefixedZone(_state, _code, _type, range) {
    return { prefix: this.sourceString.slice(0, 3), ...range.parse() };
  },
  zoneRange(from, _gt, to) {
    const first = Number(from.sourceString);
    return { from: first, to: Number(to.children[0]?.sourceString ?? first) };
  },
};
