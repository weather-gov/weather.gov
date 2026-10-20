import { readFileSync } from "node:fs";
import { expect } from "chai";
import { parseSFT } from "./parse.js";

// Trimmed from SFTPQ2 issued 2026-10-13T18:30:00Z
const SFT = readFileSync(new URL("./SFTPQ2.txt", import.meta.url), "utf8");

const ISSUED = "2026-10-13T18:30:00+00:00";

describe("SFT parser", () => {
  it("keys entries by zone in header order", () => {
    const entries = parseSFT(SFT, ISSUED);

    expect(Object.keys(entries)).to.eql(["PWZ004", "FMZ037", "FMZ023"]);
    expect(entries.FMZ023.name).to.equal("CHUUK AIRPORT");
    expect(entries.FMZ023.days).to.have.length(7);
  });

  it("reads words, temps and PoPs with a blank first night", () => {
    const [today, tomorrow] = parseSFT(SFT, ISSUED).PWZ004.days;

    expect(today).to.eql({
      date: "2026-10-14",
      word: "PTSUNNY",
      low: null,
      high: 86,
      nightPop: null,
      dayPop: 30,
    });
    expect(tomorrow).to.eql({
      date: "2026-10-15",
      word: "PTSUNNY",
      low: 78,
      high: 86,
      nightPop: 30,
      dayPop: 30,
    });
  });

  it("reads MM as missing", () => {
    const monday = parseSFT(SFT, ISSUED).FMZ023.days[5];

    expect(monday).to.include({ word: null, low: null, high: null });
  });

  it("rolls header dates into the next year after December", () => {
    const text = SFT.replace(
      "OCT 14   OCT 15   OCT 16   OCT 17   OCT 18   OCT 19   OCT 20",
      "DEC 30   DEC 31   JAN 01   JAN 02   JAN 03   JAN 04   JAN 05",
    );
    const days = parseSFT(text, "2026-12-30T18:30:00+00:00").PWZ004.days;

    expect(days.map(({ date }) => date)).to.eql([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
      "2027-01-04",
      "2027-01-05",
    ]);
  });

  describe("with malformed input", () => {
    it("throws for empty text or no FCST header", () => {
      expect(() => parseSFT("", ISSUED)).to.throw(/expected "000"/);
      expect(() => parseSFT(SFT.replace(/FCST/g, "XXXX"), ISSUED)).to.throw(
        /Line 1[0-9]/,
      );
    });

    it("throws when an entry is missing for a zone", () => {
      const text = SFT.replace(/ {3}CHUUK AIRPORT[\s\S]*?\n\n/, "");

      expect(() => parseSFT(text, ISSUED)).to.throw(
        "SFT has 3 zones, 2 entries",
      );
    });

    it("drops only the zone of an entry with more days than the header", () => {
      const text = SFT.replace(
        "78/86    78/86    78/88",
        "78/86    78/86    78/88  1/1",
      );

      expect(Object.keys(parseSFT(text, ISSUED))).to.eql(["FMZ037", "FMZ023"]);
    });
  });
});
