import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";
import dayjs from "../../util/day.js";

describe("county data index", () => {
  let openDatabase,
    db,
    getAlertsForCountyFIPS,
    getRiskOverview,
      getCountyData,
      getWeatherStories,
      getBriefing,
    sandbox;

  before(async () => {
    sandbox = sinon.createSandbox();

    openDatabase = sandbox.stub();
    db = { query: sandbox.stub() };
    openDatabase.resolves(db);

    getAlertsForCountyFIPS = sandbox.stub();
    getRiskOverview = sandbox.stub();
    getWeatherStories  = sandbox.stub();
    getBriefing = sandbox.stub();

    await quibble.esm("../db.js", {}, openDatabase);
    await quibble.esm("../weatherstory.js", {}, getWeatherStories);
    await quibble.esm("../briefing.js", {}, getBriefing);
    await quibble.esm("../alerts/index.js", { getAlertsForCountyFIPS }, {});
    await quibble.esm("../risk-overview/index.js", { getRiskOverview }, {});

    const module = await import("./index.js");
    getCountyData = module.getCountyData;
  });

  beforeEach(() => {
    sandbox.resetHistory();
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });

  it("handles an unexpected error", async () => {
    db.query.rejects(new Error("Oh noes"));

    const actual = await getCountyData("yonder");

    expect(actual).to.eql({
      error: "Error fetching county data for FIPS yonder",
    });
  });

  it("returns a 404 if we don't have a county for the FIPS code", async () => {
    db.query.resolves({ rows: [] });

    const actual = await getCountyData("some county");

    expect(actual).to.eql({
      status: 404,
      error: "No county found for FIPS some county",
    });
  });

  describe("with a real county", () => {
    let clock;
    before(() => {
      clock = sinon.useFakeTimers();
    });

    beforeEach(() => {
      getWeatherStories.resolves([]);
      getBriefing.resolves({briefing: null});
      db.query.onFirstCall().resolves({
        rows: [
          {
            state: "FR",
            statename: "Franklin",
            county: "Benjaminsonville",
            timezone: "America/New_York",
            shape: `{ "type": "oblong" }`,
            primarywfo: 37,
            wfos: [
              "FRA"
            ]
          },
        ],
      });

      db.query.onSecondCall().resolves({ rows: [{ wfo: "FRA" }] });
    });

    after(() => {
      clock.restore();
    });

    it("returns whatever risk overview data it gets", async () => {
      getRiskOverview.resolves("mercy sakes");
      getAlertsForCountyFIPS.resolves({ items: [] });

      const actual = await getCountyData("11223");

      // For this test, we're going to ignore alert days since it has some
      // time testing in it.
      delete actual.alertDays;

      expect(actual).to.eql({
        county: {
          state: "FR",
          statename: "Franklin",
          county: "Benjaminsonville",
          countyfips: "11223",
          statefips: "11",
          timezone: "America/New_York",
          shape: { type: "oblong" },
          primarywfo: "FRA",
          wfos: ["FRA"],
        },
        riskOverview: "mercy sakes",
        alerts: { items: [] },
        weatherstories: [],
        briefings: [
          {briefing: null, officeId: "FRA"}
        ]
      });
    });

    it("returns alerts and associated days", async () => {
      getRiskOverview.resolves("howdy");

      const now = dayjs("1987-10-21T19:32:14Z").tz("America/New_York");
      clock.tick(now.valueOf());

      getAlertsForCountyFIPS.resolves({
        items: [
          {
            // Alert starts on day 2 and ends on day 3, should be on both
            onset: now.add(1, "day"),
            finish: now.add(2, "days").add(1, "hour"),
            alert: "ONE",
          },
          {
            // Alert started yesterday but ends early this morning. Should be on day 1.
            onset: now.subtract(1, "day"),
            finish: now.startOf("day").add(1, "hour"),
            alert: "TWO",
          },
          {
            // Alert starts and ends in 2 days, should only be on day 3.
            onset: now.add(2, "days"),
            finish: now.add(2, "days").add(1, "hour"),
            alert: "THREE",
          },
        ],
      });

      const actual = await getCountyData("11223");

      // Validates that alerts know which days they belong to, too.
      expect(actual.alerts.items[0].alertDays).to.eql([2, 3]);
      expect(actual.alerts.items[1].alertDays).to.eql([1]);
      expect(actual.alerts.items[2].alertDays).to.eql([3]);

      // Validate that we've got the right day names and alerts associated with
      // each alert day.
      expect(
        actual.alertDays.map(({ alerts, day }) => ({ alerts, day })),
      ).to.eql([
        { alerts: [1], day: "Wednesday" },
        { alerts: [0], day: "Thursday" },
        { alerts: [0, 2], day: "Friday" },
        { alerts: [], day: "Saturday" },
        { alerts: [], day: "Sunday" },
      ]);

      // Now validate alert day start and end times
      expect(actual.alertDays[0].start.toISOString()).to.equal(
        "1987-10-21T04:00:00.000Z",
      );
      expect(actual.alertDays[0].end.toISOString()).to.equal(
        "1987-10-22T04:00:00.000Z",
      );

      expect(actual.alertDays[1].start.toISOString()).to.equal(
        "1987-10-22T04:00:00.000Z",
      );
      expect(actual.alertDays[1].end.toISOString()).to.equal(
        "1987-10-23T04:00:00.000Z",
      );

      expect(actual.alertDays[2].start.toISOString()).to.equal(
        "1987-10-23T04:00:00.000Z",
      );
      expect(actual.alertDays[2].end.toISOString()).to.equal(
        "1987-10-24T04:00:00.000Z",
      );

      expect(actual.alertDays[3].start.toISOString()).to.equal(
        "1987-10-24T04:00:00.000Z",
      );
      expect(actual.alertDays[3].end.toISOString()).to.equal(
        "1987-10-25T04:00:00.000Z",
      );

      expect(actual.alertDays[4].start.toISOString()).to.equal(
        "1987-10-25T04:00:00.000Z",
      );
      expect(actual.alertDays[4].end.toISOString()).to.equal(
        "1987-10-26T04:00:00.000Z",
      );
    });
  });

  describe("weather stories", () => {
    let clock;
    before(() => {
      clock = sinon.useFakeTimers();
    });

    beforeEach(() => {
      getRiskOverview.resolves("mercy sakes");
      getAlertsForCountyFIPS.resolves({ items: [] });
      getWeatherStories.resolves([]);
      getBriefing.resolves({briefing: null});
      db.query.onFirstCall().resolves({
        rows: [
          {
            state: "FR",
            statename: "Franklin",
            county: "Benjaminsonville",
            timezone: "America/New_York",
            shape: `{ "type": "oblong" }`,
            primarywfo: 37,
            wfos: [
              "FRA"
            ]
          },
        ],
      });

      db.query.onSecondCall().resolves({ rows: [{ wfo: "FRA" }] });
    });

    after(() => {
      clock.restore();
    });
    
    it("only adds the first weather story available for the WFO", async() => {
      getWeatherStories.resolves([
        {id: 1},
        {id: 2},
        {id: 3}
      ]);

      const actual  = await getCountyData("11223");
      
      expect(actual.weatherstories).to.eql([{id: 1}]);
    });

    it("returns valid weather stories for each WFO (in case of multiple WFOs)", async() => {
      const wfos = [
        "FRA",
        "TST"
      ];
      db.query.onFirstCall().resolves({
        rows: [
          {
            state: "FR",
            statename: "Franklin",
            county: "Benjaminsonville",
            timezone: "America/New_York",
            shape: `{ "type": "oblong" }`,
            primarywfo: 37,
            wfos: wfos
          },
        ],
      });
      getWeatherStories.withArgs("FRA").resolves([
        {storyFor: "FRA"}
      ]);
      getWeatherStories.withArgs("TST").resolves([
        {storyFor: "TST"}
      ]);

      const expected = [
        {storyFor: "FRA"},
        {storyFor: "TST"}
      ];
      const actual = await getCountyData("11223");
      
   
      expect(actual.weatherstories).to.eql(expected);
    });
  });

  describe("briefings", () => {
    let clock;
    before(() => {
      clock = sinon.useFakeTimers();
    });

    beforeEach(() => {
      getRiskOverview.resolves("mercy sakes");
      getAlertsForCountyFIPS.resolves({ items: [] });
      getWeatherStories.resolves([]);
      getBriefing.resolves({briefing: null});
      db.query.onFirstCall().resolves({
        rows: [
          {
            state: "FR",
            statename: "Franklin",
            county: "Benjaminsonville",
            timezone: "America/New_York",
            shape: `{ "type": "oblong" }`,
            primarywfo: 37,
            wfos: [
              "FRA"
            ]
          },
        ],
      });

      db.query.onSecondCall().resolves({ rows: [{ wfo: "FRA" }] });
    });

    after(() => {
      clock.restore();
    });

    it("returns the requested briefing from a valid single wfo", async () => {
      const briefingData = {
        briefing: {id: "something", officeId: "FRA"}
      };
      getBriefing.resolves(briefingData);

      const expected = [
        {
          officeId: "FRA",
          ...briefingData
        }
      ];
      const actual = await getCountyData("11223");

      expect(actual.briefings).to.eql(expected);
    });

    it("adds the officeId to error responses", async () => {
      const briefingData = { error: true };
      getBriefing.resolves(briefingData);

      const expected = [{
        officeId: "FRA",
        ...briefingData
      }];

      const actual = await getCountyData("11223");

      expect(actual.briefings).to.eql(expected);
    });

    it("returns multiple briefings from valid wfos", async () => {
      const wfos = [
        "FRA",
        "TST"
      ];
      db.query.onFirstCall().resolves({
        rows: [
          {
            state: "FR",
            statename: "Franklin",
            county: "Benjaminsonville",
            timezone: "America/New_York",
            shape: `{ "type": "oblong" }`,
            primarywfo: 37,
            wfos: wfos
          },
        ],
      });
      const briefing1 = {
        briefing: {id: 1 }
      };
      const briefing2 = {
        briefing: {id: 2}
      };
      getBriefing.withArgs("FRA").resolves(briefing1);
      getBriefing.withArgs("TST").resolves(briefing2);

      const expected = [
        {officeId: "FRA", ...briefing1},
        {officeId: "TST", ...briefing2},
      ];
      const actual = await getCountyData("11223");

      expect(actual.briefings).to.eql(expected);
    });
  });
});
