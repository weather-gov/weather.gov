import { logger } from "../../../util/monitoring/index.js";
import { loadGrammar, matchProduct, productActions } from "../grammar.js";

const productLogger = logger.child({ subsystem: "product:sft" });

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const grammar = loadGrammar(new URL("./sft.ohm", import.meta.url));

const semantics = grammar.createSemantics().addOperation("parse", {
  ...productActions,
  product(
    _header,
    _awips,
    ugc,
    _b1,
    _title,
    _b2,
    _legend,
    _b3,
    columns,
    _b4,
    groups,
    _end,
    _eol,
    _b5,
    _eof,
  ) {
    return {
      zones: ugc.parse(),
      dates: columns.parse(),
      entries: groups.children.flatMap((group) => group.parse()),
    };
  },
  columns(_fcst, _days, dates) {
    return dates.parse();
  },
  dateRow(_spaces, dates, _eol) {
    return dates.children.map((date) => date.sourceString);
  },
  group(_open, _name, _close, _eol, _blank, entries) {
    return entries.children.map((entry) => entry.sourceString);
  },
  entry(_spaces, name, _eol, words, temps, pops, _blank) {
    return {
      name: name.sourceString,
      words: words.parse(),
      temps: temps.parse(),
      pops: pops.parse(),
    };
  },
  wordRow(_spaces, words, _eol) {
    return words.children.map(({ sourceString }) =>
      sourceString === "MM" ? null : sourceString,
    );
  },
  pairRow(_spaces, pairs, _eol) {
    return pairs.children.map((pair) => pair.parse());
  },
  pair(first, _slash, second) {
    return [first, second].map((value) => value.children[0]?.parse() ?? null);
  },
  value(_) {
    return this.sourceString === "MM" ? null : Number(this.sourceString);
  },
});

// Header dates like OCT 08 as YYYY-MM-DD, rolling the year over from December
const toDate = (date, issued) => {
  const [name, day] = date.split(" ");
  const month = MONTHS.indexOf(name);
  const year =
    issued.getUTCFullYear() + (month < issued.getUTCMonth() - 6 ? 1 : 0);
  return `${year}-${String(month + 1).padStart(2, "0")}-${day}`;
};

// SFT entries keyed by UGC zone in header order, each with 7 days of word, temps and PoPs
export const parseSFT = (text, issuanceTime) => {
  const { zones, dates, entries } = semantics(
    matchProduct(grammar, text),
  ).parse();

  // Zones pair with entries by position, so a count mismatch makes the whole product suspect
  if (zones.length !== entries.length) {
    throw new Error(`SFT has ${zones.length} zones, ${entries.length} entries`);
  }

  const issued = new Date(issuanceTime);
  const days = dates.map((date) => toDate(date, issued));

  const forecasts = {};
  entries.forEach((entry, i) => {
    // A garbled entry only drops its own zone
    try {
      const { name, words, temps, pops } = semantics(
        matchProduct(grammar, entry, "entry"),
      ).parse();

      for (const row of [words, temps, pops]) {
        if (row.length !== days.length) {
          throw new Error(
            `SFT ${name} has ${row.length} of ${days.length} days`,
          );
        }
      }

      forecasts[zones[i]] = {
        name,
        days: days.map((date, day) => ({
          date,
          word: words[day],
          low: temps[day][0],
          high: temps[day][1],
          nightPop: pops[day][0],
          dayPop: pops[day][1],
        })),
      };
    } catch (err) {
      productLogger.warn({ err, zone: zones[i] }, "unparseable SFT entry");
    }
  });

  return forecasts;
};
