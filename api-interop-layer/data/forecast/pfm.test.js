import { readFileSync } from "node:fs";
import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";
import { parsePFM } from "../products/pfm/parse.js";
import { parseSFT } from "../products/sft/parse.js";
import { toForecast, toGridpoint, toHourly } from "./pfm.js";

const PFM = readFileSync(
  new URL("../products/pfm/PFMPQ2.txt", import.meta.url),
  "utf8",
);

const SFT = readFileSync(
  new URL("../products/sft/SFTPQ2.txt", import.meta.url),
  "utf8",
);

const ISSUED = "2026-10-13T18:30:00+00:00";

const timezone = "Pacific/Palau";

const replaceLine = (text, prefix, line) =>
  text.replace(new RegExp(`^${prefix}.*$`, "m"), line);

describe("PFM forecast", () => {
  describe("shapes the API responses", () => {
    let clock;
    let steps;
    let sftDays;

    before(() => {
      steps = parsePFM(PFM).PWZ003.steps;
      sftDays = parseSFT(SFT, ISSUED).PWZ004.days;
    });

    beforeEach(() => {
      // 7am Wednesday in Palau
      clock = sinon.useFakeTimers({
        now: new Date("2026-10-13T22:10:00Z"),
        toFake: ["Date"],
      });
    });

    afterEach(() => {
      clock.restore();
    });

    describe("/forecast", () => {
      it("builds periods from now to the last high or low", () => {
        const { periods } = toForecast(steps, sftDays, timezone).properties;

        expect(periods).to.have.length(13);
        expect(periods[0]).to.include({
          startTime: "2026-10-14T07:00:00+09:00",
          endTime: "2026-10-14T18:00:00+09:00",
          isDaytime: true,
          temperature: 86,
          shortForecast: "Partly sunny",
          icon: "https://api.weather.gov/icons/land/day/sct",
        });
        expect(periods[0].probabilityOfPrecipitation.value).to.equal(30);
        expect(periods.at(-1).endTime).to.equal("2026-10-20T18:00:00+09:00");
      });

      it("reuses the day's SFT word for the night after it", () => {
        const [, night] = toForecast(steps, sftDays, timezone).properties
          .periods;

        expect(night).to.include({
          isDaytime: false,
          temperature: 78,
          shortForecast: "Partly cloudy",
          icon: "https://api.weather.gov/icons/land/night/sct",
        });
      });

      it("leaves the condition blank for an unknown SFT word", () => {
        const days = sftDays.map((day) => ({ ...day, word: "BLIZZARD" }));
        const [first] = toForecast(steps, days, timezone).properties.periods;

        expect(first).to.include({ icon: null, shortForecast: "" });
      });
    });

    describe("/forecast/hourly", () => {
      it("gives each step inside a period that period's condition", () => {
        const forecast = toForecast(steps, sftDays, timezone);
        const { periods } = toHourly(steps, forecast).properties;

        expect(periods[0]).to.eql({
          startTime: "2026-10-13T23:00:00.000Z",
          endTime: "2026-10-14T00:00:00.000Z",
          icon: "https://api.weather.gov/icons/land/day/sct",
          shortForecast: "Partly sunny",
        });
        expect(periods.every(({ icon }) => icon)).to.be.true;
      });
    });

    describe("/gridpoints", () => {
      it("lays out hourly values as numbers", () => {
        const { properties } = toGridpoint(steps);

        expect(properties.temperature.values[1]).to.eql({
          validTime: "2026-10-13T20:00:00.000Z/PT1H",
          value: 78,
        });
        expect(properties.windSpeed.values[1].value).to.equal(6);
        expect(properties.windDirection.values[1].value).to.equal(270);
        expect(properties.apparentTemperature.values[2].value).to.equal(88);
        expect(properties.temperature.values[0].value).to.be.null;
      });

      it("reads PWIND DIR in the 6 hourly table", () => {
        const { values } = toGridpoint(steps).properties.windDirection;

        expect(values[23].value).to.equal(270);
        expect(values.at(-1).value).to.equal(225);
      });

      it("gives each step the PoP of the 12 hr window it falls in", () => {
        const { values } =
          toGridpoint(steps).properties.probabilityOfPrecipitation;

        expect(values[1].value).to.equal(30);
        // The 6 hourly table goes to 20%
        expect(values[27].value).to.equal(20);
        expect(values.at(-1).value).to.be.null;
      });

      it("spreads QPF back over its 12 hr window in mm", () => {
        const [first] =
          toGridpoint(steps).properties.quantitativePrecipitation.values;

        expect(first).to.eql({
          validTime: "2026-10-13T20:00:00.000Z/PT12H",
          value: 2.54,
        });
      });
    });
  });

  describe("forecast for a zone", () => {
    let getLatestProduct, getPfmForecast, clock, sandbox;

    const grid = { wfo: "PQW", zone: "PWZ004" };
    const place = { timezone };

    const product = (productText) => ({ issuanceTime: ISSUED, productText });

    before(async () => {
      sandbox = sinon.createSandbox();
      getLatestProduct = sandbox.stub();

      await quibble.esm("../connectionPool.js", {}, {});
      await quibble.esm("../../redis.js", {
        saveToRedis: sandbox.stub(),
        getFromRedis: sandbox.stub(),
      });
      await quibble.esm("../products/index.js", { getLatestProduct });

      const module = await import("./pfm.js");
      getPfmForecast = module.default;
    });

    beforeEach(() => {
      sandbox.resetBehavior();
      sandbox.resetHistory();
      clock = sinon.useFakeTimers({
        now: new Date("2026-10-13T22:10:00Z"),
        toFake: ["Date"],
      });
      getLatestProduct.withArgs("PFM").resolves(product(PFM));
      getLatestProduct.withArgs("SFT").resolves(product(SFT));
    });

    afterEach(() => {
      clock.restore();
    });

    after(async () => {
      sandbox.restore();
      await quibble.reset();
    });

    it("forecasts Koror from the Palau airport PFM entry", async () => {
      const { daily } = await getPfmForecast({ grid, place });

      expect(daily.error).to.be.undefined;
      expect(daily.days).to.have.length(7);
      expect(daily.days[0].periods[0].data.description).to.equal(
        "Partly sunny",
      );
      expect(daily.days[0].hours.length).to.be.greaterThan(0);
    });

    it("errors when the PFM can't be fetched", async () => {
      getLatestProduct.withArgs("PFM").resolves({ error: true, status: 500 });

      expect(await getPfmForecast({ grid, place })).to.eql({
        gridData: {},
        daily: { error: true },
      });
    });

    it("flags no forecast when the zone isn't in the PFM", async () => {
      expect(
        await getPfmForecast({ grid: { wfo: "PQW", zone: "FMZ099" }, place }),
      ).to.eql({ gridData: {}, daily: { error: true, noForecast: true } });
    });

    describe("with malformed products", () => {
      it("errors instead of throwing when the PFM has no text", async () => {
        getLatestProduct.withArgs("PFM").resolves(product(undefined));

        expect(await getPfmForecast({ grid, place })).to.eql({
          gridData: {},
          daily: { error: true },
        });
      });

      it("flags no forecast when the zone's PFM block is garbled", async () => {
        getLatestProduct
          .withArgs("PFM")
          .resolves(product(replaceLine(PFM, "UTC 3HRLY", "UTC 3HRLY")));

        expect(
          await getPfmForecast({
            grid: { wfo: "PQW", zone: "PWZ003" },
            place,
          }),
        ).to.eql({ gridData: {}, daily: { error: true, noForecast: true } });
      });

      it("forecasts without conditions when the SFT can't be fetched", async () => {
        getLatestProduct.withArgs("SFT").resolves({ error: true, status: 500 });

        const { daily } = await getPfmForecast({ grid, place });

        expect(daily.error).to.be.undefined;
        expect(daily.days[0].periods[0].data.description).to.equal("");
      });

      it("forecasts without conditions when the SFT is garbled", async () => {
        getLatestProduct
          .withArgs("SFT")
          .resolves(product(SFT.slice(0, SFT.indexOf("   TODAY"))));

        const { daily } = await getPfmForecast({ grid, place });

        expect(daily.error).to.be.undefined;
        expect(daily.days).to.have.length(7);
      });
    });
  });
});
