import { logger } from "../../../util/monitoring/index.js";
import { loadGrammar, matchProduct, productActions } from "../grammar.js";

const productLogger = logger.child({ subsystem: "product:pfm" });

const grammar = loadGrammar(new URL("./pfm.ohm", import.meta.url));

// Position of a node within its line
const column = ({ source }) =>
  source.startIdx -
  (source.sourceString.lastIndexOf("\n", source.startIdx - 1) + 1);

// One DATE/GMT/UTC table, keyed by UTC time
const toSteps = (date, localHours, utcHours, rows) => {
  const [month, day, year] = date.split("/").map(Number);

  // Right edge of each time column, values are right-aligned under it
  const ends = utcHours.map(({ end }) => end);
  if (
    localHours.length !== utcHours.length ||
    localHours.some(({ end }, i) => end !== ends[i])
  ) {
    throw new Error(`PFM GMT and UTC rows misaligned on ${date}`);
  }

  // The GMT row is really local time, so take the offset from the UTC row
  const offset = (localHours[0].hour - utcHours[0].hour + 24) % 24;

  let time = Date.UTC(2000 + year, month - 1, day);
  const steps = localHours.map(({ hour }, i) => {
    if (i > 0 && hour < localHours[i - 1].hour) {
      time += 24 * 60 * 60 * 1000;
    }
    return {
      time: new Date(time + (hour - offset) * 60 * 60 * 1000),
      values: {},
    };
  });

  for (const { label, cells } of rows) {
    for (const { text, start } of cells) {
      const end = start + text.length;

      // 3-digit values touch their neighbor (97100100), so split on column edges but never before a decimal
      const cuts = ends.filter(
        (edge) => edge > start && edge < end && text[edge - start] !== ".",
      );
      [start, ...cuts].forEach((from, i) => {
        const to = cuts[i] ?? end;
        const step = steps[ends.indexOf(to)];
        if (!step || label in step.values) {
          throw new Error(`PFM ${label} value off the column grid on ${date}`);
        }
        step.values[label] = text.slice(from - start, to - start);
      });
    }
  }

  return steps;
};

const semantics = grammar.createSemantics().addOperation("parse", {
  ...productActions,
  product(_header, _awips, _b1, _title, _b2, blocks, _end) {
    return blocks.children.map((block) => block.sourceString);
  },
  segment(ugc, name, _coords, _issued, _b1, tables, _end, _eol, _b2) {
    return {
      zones: ugc.parse(),
      name: name.sourceString.trim(),
      steps: tables.children.flatMap((table) => table.parse()),
    };
  },
  table(date, local, utc, _b1, rows, _b2) {
    return toSteps(
      date.parse(),
      local.parse(),
      utc.parse(),
      rows.children.map((row) => row.parse()),
    );
  },
  dateRow(_date, _spaces, tokens, _eol) {
    return tokens.children.find(({ sourceString }) =>
      sourceString.includes("/"),
    ).sourceString;
  },
  localRow(_gmt, _interval, hours) {
    return hours.parse();
  },
  utcRow(_utc, _interval, hours) {
    return hours.parse();
  },
  hours(_spaces, hours, _eol) {
    return hours.children.map((hour) => ({
      hour: Number(hour.sourceString),
      end: column(hour) + 2,
    }));
  },
  row(label, _spaces, cells, _eol) {
    return {
      label: label.sourceString,
      cells: cells.children.map((cell) => ({
        text: cell.sourceString,
        start: column(cell),
      })),
    };
  },
});

// PFM entries keyed by UGC zone, each with steps of UTC time and raw row values
export const parsePFM = (text) => {
  const entries = {};

  for (const block of semantics(matchProduct(grammar, text)).parse()) {
    // A garbled block only drops its own zones
    try {
      const { zones, name, steps } = semantics(
        matchProduct(grammar, block, "segment"),
      ).parse();

      const entry = { name, steps };
      for (const zone of zones) {
        entries[zone] = entry;
      }
    } catch (err) {
      productLogger.warn(
        { err, ugc: block.split("\n")[0] },
        "unparseable PFM block",
      );
    }
  }

  return entries;
};
