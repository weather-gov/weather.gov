import { readFileSync } from "node:fs";
import { expect } from "chai";
import { parsePFM } from "./parse.js";

// Trimmed from PFMPQ2 issued 2026-10-13T18:30:00Z
const PFM = readFileSync(new URL("./PFMPQ2.txt", import.meta.url), "utf8");

const replaceLine = (text, prefix, line) =>
  text.replace(new RegExp(`^${prefix}.*$`, "m"), line);

describe("PFM parser", () => {
  it("keys each block by its UGC zones, expanding a carried prefix", () => {
    const entries = parsePFM(PFM);

    expect(Object.keys(entries)).to.eql(["PWZ003", "FMZ037", "FMZ023"]);
    expect(entries.PWZ003.name).to.equal(
      "PALAU INTERNATIONAL AIRPORT-AIRAI PW",
    );
    expect(entries.FMZ023).to.equal(entries.FMZ037);
  });

  it("expands NNN>NNN zone ranges", () => {
    const text = PFM.replace("PWZ003-140600-", "PWZ001>003-140600-");

    expect(Object.keys(parsePFM(text))).to.eql([
      "PWZ001",
      "PWZ002",
      "PWZ003",
      "FMZ037",
      "FMZ023",
    ]);
  });

  it("puts both tables on UTC times, taking the offset from the UTC row", () => {
    const { steps } = parsePFM(PFM).PWZ003;

    expect(steps).to.have.length(38);
    expect(steps[0].time.toISOString()).to.equal("2026-10-13T17:00:00.000Z");
    expect(steps[1].time.toISOString()).to.equal("2026-10-13T20:00:00.000Z");
    // GMT 00 rolls to the next day
    expect(steps[7].time.toISOString()).to.equal("2026-10-14T14:00:00.000Z");
    // First column of the 6 hourly table
    expect(steps[22].time.toISOString()).to.equal("2026-10-16T14:00:00.000Z");
    expect(steps.at(-1).time.toISOString()).to.equal(
      "2026-10-20T08:00:00.000Z",
    );
  });

  it("reads right-aligned values into their columns", () => {
    const { steps } = parsePFM(PFM).PWZ003;

    expect(steps[0].values).to.eql({});
    expect(steps[1].values).to.include({
      TEMP: "78",
      RH: "94",
      "WIND DIR": "W",
      "WIND SPD": "6",
    });
    expect(steps[5].values).to.include({
      "MAX/MIN": "86",
      "POP 12HR": "30",
      "QPF 12HR": "0.10",
      "MAX HEAT": "95",
    });
    expect(steps[23].values).to.include({
      "MIN/MAX": "78",
      "PWIND DIR": "W",
      "POP 12HR": "30",
    });
  });

  it("splits 3 digit values that touch their neighbor", () => {
    const text = replaceLine(
      PFM,
      "RH ",
      "RH               94100 72100 74 82 88 91 94 85 75 72 77 82 88 91 94 85 72 70 77",
    );
    const { steps } = parsePFM(text).PWZ003;

    expect(steps.slice(1, 5).map(({ values }) => values.RH)).to.eql([
      "94",
      "100",
      "72",
      "100",
    ]);
  });

  describe("with malformed input", () => {
    it("throws for empty or unrelated text", () => {
      expect(() => parsePFM("")).to.throw(/expected "000"/);
      expect(() => parsePFM("not a product\nat all")).to.throw(/Line 1/);
    });

    it("drops only the zones of a block cut off after its DATE row", () => {
      const truncated = PFM.replace(/GMT 3HRLY[\s\S]*?(?=\$\$)/, "");

      expect(Object.keys(parsePFM(truncated))).to.eql(["FMZ037", "FMZ023"]);
    });

    it("drops only the zones of a block with an indented row label", () => {
      const text = PFM.replace("TEMP             78", " TEMP            78");

      expect(Object.keys(parsePFM(text))).to.eql(["FMZ037", "FMZ023"]);
    });

    it("drops only the zones of a block with a value off the column grid", () => {
      const text = PFM.replace("TEMP             78", "TEMP            78 ");

      expect(Object.keys(parsePFM(text))).to.eql(["FMZ037", "FMZ023"]);
    });

    it("keeps earlier blocks when the product is cut off", () => {
      const truncated = PFM.slice(
        0,
        PFM.indexOf("POP 12HR                     50"),
      );

      expect(Object.keys(parsePFM(truncated))).to.eql(["PWZ003"]);
    });
  });
});
