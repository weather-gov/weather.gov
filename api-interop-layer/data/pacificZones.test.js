import { expect } from "chai";
import quibble from "quibble";
import sinon from "sinon";

describe("pacific zones", () => {
  let db, getPacificZoneGridData, isInPacificZoneExtent, sandbox;

  before(async () => {
    sandbox = sinon.createSandbox();
    db = { query: sandbox.stub() };

    await quibble.esm("./db.js", {}, sandbox.stub().resolves(db));

    const module = await import("./pacificZones.js");
    getPacificZoneGridData = module.getPacificZoneGridData;
    isInPacificZoneExtent = module.isInPacificZoneExtent;
  });

  beforeEach(() => {
    sandbox.resetHistory();
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });

  describe("zone extent", () => {
    it("includes Palau, Micronesia and the Marshall Islands", () => {
      expect(isInPacificZoneExtent(7.341, 134.479)).to.be.true;
      expect(isInPacificZoneExtent(9.514, 138.129)).to.be.true;
      expect(isInPacificZoneExtent(7.447, 151.847)).to.be.true;
      expect(isInPacificZoneExtent(7.09, 171.38)).to.be.true;
    });

    it("excludes Guam, the CNMI and Hawaii", () => {
      expect(isInPacificZoneExtent(13.444, 144.794)).to.be.false;
      expect(isInPacificZoneExtent(15.177, 145.75)).to.be.false;
      expect(isInPacificZoneExtent(21.307, -157.858)).to.be.false;
    });
  });

  describe("zone grid data", () => {
    it("returns the nearest PQW/PQE forecast zone as a grid", async () => {
      db.query.resolves({ rows: [{ zone: "PWZ004", wfo: "PQW" }] });

      const actual = await getPacificZoneGridData(7.341, 134.479);

      expect(actual).to.eql({
        wfo: "PQW",
        zone: "PWZ004",
        type: "land",
        source: "zone",
      });
      expect(db.query.firstCall.args[1]).to.eql([["PQW", "PQE"], 80000]);
    });

    it("returns false when no zone is within range", async () => {
      db.query.resolves({ rows: [] });

      expect(await getPacificZoneGridData(5, 160)).to.be.false;
    });

    it("returns false when the database errors", async () => {
      db.query.rejects(new Error("connection refused"));

      expect(await getPacificZoneGridData(7.341, 134.479)).to.be.false;
    });
  });
});
