import sinon from "sinon";
import { expect } from "chai";
import * as mariadb from "mariadb";
import dayjs from "../../util/day.js";
import { alignAlertsToDaily } from "./utils.js";

/**
 * Test helper for creating arrays of mock
 * day / hours objects
 */
const makeDayWithHours = (
  startTimestamp,
  numHours,
  timezone = "America/New_York",
) => {
  const hours = [];
  const start = dayjs.utc(startTimestamp).tz(timezone);
  for (let i = 0; i < numHours; i += 1) {
    const time = start.add(i, "hours");
    hours.push({ time });
  }
  return {
    hours,
  };
};

describe("alert data module", () => {
  const sandbox = sinon.createSandbox();
  const db = {
    query: sandbox.stub(),
    end: () => Promise.resolve(),
  };

  const response = { status: 200, json: sandbox.stub() };

  // Do this before everything, so it'll happen before any describe blocks run,
  // otherwise the connection creation won't be stubbed when the script is first
  // imported below.
  before(() => {
    mariadb.default.createConnection.resolves(db);
  });

  beforeEach(() => {
    response.status = 200;
    sandbox.resetBehavior();
    sandbox.resetHistory();

    fetch.resolves(response);
    db.query.resolves([{ yes: 1 }]);
  });

  it("fetches alerts when the module is loaded", async () => {
    response.json.resolves({ features: [] });
    await import("./index.js");

    expect(
      fetch.calledWith("https://api.weather.gov/alerts/active?status=actual"),
    ).to.be.true;
  });

  describe("after initial setup", () => {
    let alertHandler;
    before(async () => {
      alertHandler = await import("./index.js");
    });

    describe("error handling", () => {
      beforeEach(async () => {
        response.json.resolves({
          features: [
            {
              geometry: "geo",
              properties: {
                id: "one",
                event: "Severe Thunderstorm Warning",
                sent: dayjs().subtract(1, "minute").toISOString(),
                effective: dayjs().subtract(1, "minute").toISOString(),
                onset: dayjs().subtract(1, "minute").toISOString(),
                expires: dayjs().add(1, "minute").toISOString(),
                ends: dayjs().add(1, "minute").toISOString(),
              },
            },
          ],
        });

        await alertHandler.updateAlerts();

        response.json.resetBehavior();
        response.json.resetHistory();
      });

      it("updates metadata but does NOT update alerts if there is an error", async () => {
        const expected = await alertHandler.default({
          grid: { geometry: [] },
          place: { timezone: "America/Chicago" },
        });

        response.status = 400;
        response.json.resolves({ no: "errors" });
        await alertHandler.updateAlerts();

        const actual = await alertHandler.default({
          grid: { geometry: [] },
          place: { timezone: "America/Chicago" },
        });

        expect(expected.metadata.error).to.equal(false);
        expect(actual.metadata.error).to.equal(true);

        // We've validated the error flag was changed. Now validate that the
        // rest of returned data is the same.
        delete expected.metadata.error;
        delete actual.metadata.error;
        expect(actual).to.eql(expected);
      });

      it("clears the error flag after a successful update", async () => {
        response.status = 400;
        response.json.resolves({ no: "errors" });
        await alertHandler.updateAlerts();

        const initial = await alertHandler.default({
          grid: { geometry: [] },
          place: { timezone: "America/Chicago" },
        });

        response.status = 200;
        response.json.resolves({ features: [] });
        await alertHandler.updateAlerts();

        const after = await alertHandler.default({
          grid: { geometry: [] },
          place: { timezone: "America/Chicago" },
        });

        expect(initial.metadata.error).to.equal(true);
        expect(after.metadata.error).to.equal(false);

        expect(initial.items.length).to.equal(1);
        expect(after.items.length).to.equal(0);
      });
    });

    describe("the main alert function", () => {
      describe("does not store alerts that have ended", () => {
        // 24 hours ago...
        const past = new Date(Date.now() - 86_400_000).toISOString();

        const times = {
          sent: dayjs().subtract(1, "minute").toISOString(),
          effective: dayjs().subtract(1, "minute").toISOString(),
          onset: dayjs().subtract(1, "minute").toISOString(),
          expires: dayjs().add(1, "minute").toISOString(),
          ends: dayjs().add(1, "minute").toISOString(),
        };

        it("if the alert has an end time in the past", async () => {
          response.json.resolves({
            features: [
              {
                geometry: "geo",
                properties: {
                  id: "one",
                  event: "Severe Thunderstorm Warning",
                  ...times,
                  ends: past,
                },
              },
            ],
          });
          await alertHandler.updateAlerts();

          const alerts = await alertHandler.default({
            grid: { geometry: [] },
            place: { timezone: "America/Chicago" },
          });

          expect(alerts.items.length).to.equal(0);
        });

        it("if the alert does not have an end time and the expire time is in the past", async () => {
          response.json.resolves({
            features: [
              {
                geometry: "geo",
                properties: {
                  id: "one",
                  event: "Severe Thunderstorm Warning",
                  ...times,
                  ends: null,
                  expires: past,
                },
              },
            ],
          });
          await alertHandler.updateAlerts();

          const alerts = await alertHandler.default({
            grid: { geometry: [] },
            place: { timezone: "America/Chicago" },
          });

          expect(alerts.items.length).to.equal(0);
        });
      });

      it("does not store alerts that are not land-based", async () => {
        const shared = {
          sent: dayjs().subtract(1, "minute").toISOString(),
          effective: dayjs().subtract(1, "minute").toISOString(),
          onset: dayjs().subtract(1, "minute").toISOString(),
          expires: dayjs().add(1, "minute").toISOString(),
          ends: dayjs().add(1, "minute").toISOString(),
        };

        response.json.resolves({
          features: [
            {
              geometry: "geo",
              properties: {
                id: "one",
                event: "Severe Thunderstorm Warning",
                ...shared,
              },
            },
            {
              geometry: "geo",
              properties: {
                id: "two",
                event: "Special Marine Warning",
                ...shared,
              },
            },
            {
              geometry: "geo",
              properties: {
                id: "three",
                event: "Typhoon Warning",
                ...shared,
              },
            },
            {
              geometry: "geo",
              properties: {
                id: "four",
                event: "avalanche warning",
                ...shared,
              },
            },
          ],
        });

        // This is the doohickey that actually parses, filters, and sorts the
        // alerts. We need to run it first.
        await alertHandler.updateAlerts();

        const alerts = await alertHandler.default({
          grid: { geometry: [] },
          place: { timezone: "America/Chicago" },
        });

        const kinds = alerts.items.map(({ metadata: { kind } }) => kind);
        expect(kinds).to.have.same.members(["land", "land", "land"]);
      });

      it("derives an alert ID", async () => {
        response.json.resolves({
          features: [
            {
              geometry: "geo",
              properties: {
                id: "urn:oid:2.49.0.1.840.part1.part2.part3",
                event: "Severe Thunderstorm Warning",
                sent: dayjs().subtract(1, "minute").toISOString(),
                effective: dayjs().subtract(1, "minute").toISOString(),
                onset: dayjs().subtract(1, "minute").toISOString(),
                expires: dayjs().add(1, "minute").toISOString(),
                ends: dayjs().add(1, "minute").toISOString(),
              },
            },
          ],
        });

        await alertHandler.updateAlerts();

        const alerts = await alertHandler.default({
          grid: { geometry: [] },
          place: { timezone: "America/Chicago" },
        });

        expect(alerts.items[0].id).to.equal("part1_part2_part3");
      });

      it("passes unknown alert types straight through", async () => {
        response.json.resolves({
          features: [
            {
              geometry: "geo",
              properties: {
                id: "one",
                event: "Severe Meatballstorm Warning",
                sent: dayjs().subtract(1, "minute").toISOString(),
                effective: dayjs().subtract(1, "minute").toISOString(),
                onset: dayjs().subtract(1, "minute").toISOString(),
                expires: dayjs().add(1, "minute").toISOString(),
                ends: dayjs().add(1, "minute").toISOString(),
              },
            },
          ],
        });

        await alertHandler.updateAlerts();

        const {
          items: [{ event, metadata }],
        } = await alertHandler.default({
          grid: { geometry: [] },
          place: { timezone: "America/Chicago" },
        });

        expect(event).to.equal("Severe Meatballstorm Warning");
        expect(metadata).to.eql({
          level: {
            priority: Number.MAX_SAFE_INTEGER,
            text: "other",
          },
          kind: "land",
          priority: Number.MAX_SAFE_INTEGER,
        });
      });

      describe("correctly formats alert timing information", async () => {
        beforeEach(() => {
          // September 3 in some future year.
          const futureSeptemberDay = dayjs()
            .tz("America/Denver")
            .add(1, "year")
            .month(8)
            .date(3);

          const start = futureSeptemberDay.hour(7).minute(13);
          const end = futureSeptemberDay.hour(9).minute(44);

          response.json.resolves({
            features: [
              {
                geometry: "geo",
                properties: {
                  id: "one",
                  event: "Severe Meatballstorm Warning",
                  sent: dayjs().subtract(1, "minute").toISOString(),
                  effective: dayjs().subtract(1, "minute").toISOString(),
                  onset: start.toISOString(),
                  expires: end.toISOString(),
                  ends: end.toISOString(),
                },
              },
            ],
          });
        });

        it("formats the start time", async () => {
          await alertHandler.updateAlerts();

          const {
            items: [{ timing }],
          } = await alertHandler.default({
            grid: { geometry: [] },
            place: { timezone: "America/Chicago" },
          });

          expect(/^[A-Z][a-z]+day 09\/03 8:13 AM CDT$/.test(timing.start)).to.be
            .true;
        });

        it("formats the end time", async () => {
          await alertHandler.updateAlerts();

          const {
            items: [{ timing }],
          } = await alertHandler.default({
            grid: { geometry: [] },
            place: { timezone: "America/Chicago" },
          });

          expect(/^[A-Za-z]+day 09\/03 10:44 AM CDT$/.test(timing.end)).to.be
            .true;
        });
      });

      describe("correctly sets the highest alert level", () => {
        const getAlert = (type) => ({
          geometry: "geo",
          properties: {
            id: "one",
            sent: dayjs().subtract(1, "minute").toISOString(),
            effective: dayjs().subtract(1, "minute").toISOString(),
            onset: dayjs().subtract(1, "minute").toISOString(),
            expires: dayjs().add(1, "minute").toISOString(),
            ends: dayjs().add(1, "minute").toISOString(),
            event: type,
          },
        });

        it("when one of them is a warning", async () => {
          response.json.resolves({
            features: [
              getAlert("Severe Thunderstorm Warning"),
              getAlert("Severe Thunderstorm Watch"),
              getAlert("severe weather statement"),
              getAlert("avalanche advisory"),
            ],
          });

          await alertHandler.updateAlerts();

          const { highestLevel: actual } = await alertHandler.default({
            grid: { geometry: [] },
            place: { timezone: "America/Chicago" },
          });

          expect(actual).to.equal("warning");
        });

        it("when there are no warnings, but at least one watch", async () => {
          response.json.resolves({
            features: [
              getAlert("Severe Thunderstorm Watch"),
              getAlert("severe weather statement"),
              getAlert("avalanche advisory"),
            ],
          });

          await alertHandler.updateAlerts();

          const { highestLevel: actual } = await alertHandler.default({
            grid: { geometry: [] },
            place: { timezone: "America/Chicago" },
          });

          expect(actual).to.equal("watch");
        });

        it("when there are no warnings or watches", async () => {
          response.json.resolves({
            features: [
              getAlert("severe weather statement"),
              getAlert("avalanche advisory"),
            ],
          });

          await alertHandler.updateAlerts();

          const { highestLevel: actual } = await alertHandler.default({
            grid: { geometry: [] },
            place: { timezone: "America/Chicago" },
          });

          expect(actual).to.equal("other");
        });
      });
    });

    describe("computes the alert finish time", () => {
      const alertResponse = {
        features: [
          {
            geometry: "geo",
            properties: {
              id: "one",
              event: "Severe Thunderstorm Warning",
              sent: dayjs().subtract(1, "minute").toISOString(),
              effective: dayjs().subtract(1, "minute").toISOString(),
              onset: dayjs().subtract(1, "minute").toISOString(),
            },
          },
        ],
      };

      it("if the alert has an ends property", async () => {
        alertResponse.features[0].properties.ends = "2430-04-03T12:00:00Z";
        alertResponse.features[0].properties.expires = null;
        response.json.resolves(alertResponse);

        const [{ ends, finish }] = await alertHandler.updateAlerts();

        expect(ends.isSame(finish)).to.be.true;
      });

      it("if the alert does not have an ends property but does have expires", async () => {
        alertResponse.features[0].properties.ends = null;
        alertResponse.features[0].properties.expires = "2430-04-03T12:00:00Z";
        response.json.resolves(alertResponse);

        const [{ expires, finish }] = await alertHandler.updateAlerts();

        expect(expires.isSame(finish)).to.be.true;
      });

      it("if the alert has neither ends nor expires properties", async () => {
        alertResponse.features[0].properties.ends = null;
        alertResponse.features[0].properties.expires = null;
        response.json.resolves(alertResponse);

        const [{ finish }] = await alertHandler.updateAlerts();

        expect(finish).to.be.null;
      });
    });
  });

  describe("Alert to daily alignment", () => {
    it("Correctly aligns an alert appearing in the middle of its day", () => {
      const day = makeDayWithHours(
        "2024-09-09T06:00:00-04:00",
        24,
        "America/New_York",
      );
      const alerts = {
        items: [
          {
            id: "id",
            event: "test",
            onset: dayjs
              .utc("2024-09-09T15:32:00-04:00")
              .tz("America/New_York"),
            finish: dayjs
              .utc("2024-09-09T17:55:00-04:00")
              .tz("America/New_York"),
            metadata: {
              level: {
                text: "other",
              },
            },
          },
        ],
      };

      const expected = {
        metadata: {
          count: 1,
          highest: "other",
        },
        items: [
          {
            id: "id",
            offset: 9,
            duration: 3,
            event: "test",
            remainder: 12,
            level: "other",
          },
        ],
      };

      // Modifies day in place
      alignAlertsToDaily(alerts, [day]);

      expect(day.alerts).to.eql(expected);
    });
    it("Correctly aligns an alert that starts before the day, but ends within it", () => {
      const day = makeDayWithHours(
        "2024-09-09T06:00:00-04:00",
        24,
        "America/New_York",
      );
      const alerts = {
        items: [
          {
            id: "id",
            event: "test",
            onset: dayjs
              .utc("2024-09-08T23:01:00-04:00")
              .tz("America/New_York"),
            finish: dayjs
              .utc("2024-09-09T07:55:00-04:00")
              .tz("America/New_York"),
            metadata: {
              level: {
                text: "other",
              },
            },
          },
        ],
      };

      const expected = {
        metadata: {
          count: 1,
          highest: "other",
        },
        items: [
          {
            id: "id",
            offset: 0,
            duration: 2,
            event: "test",
            remainder: 22,
            level: "other",
          },
        ],
      };

      // Modifies day in place
      alignAlertsToDaily(alerts, [day]);

      expect(day.alerts).to.eql(expected);
    });
    it("Correctly aligns an alert that starts within the day, but ends after it", () => {
      const day = makeDayWithHours(
        "2024-09-09T06:00:00-04:00",
        24,
        "America/New_York",
      );
      const alerts = {
        items: [
          {
            id: "id",
            event: "test",
            onset: dayjs
              .utc("2024-09-09T15:32:00-04:00")
              .tz("America/New_York"),
            finish: dayjs
              .utc("2024-09-10T07:55:00-04:00")
              .tz("America/New_York"),
            metadata: {
              level: {
                text: "other",
              },
            },
          },
        ],
      };

      const expected = {
        metadata: {
          count: 1,
          highest: "other",
        },
        items: [
          {
            id: "id",
            offset: 9,
            duration: 15,
            event: "test",
            remainder: 0,
            level: "other",
          },
        ],
      };

      // Modifies day in place
      alignAlertsToDaily(alerts, [day]);

      expect(day.alerts).to.eql(expected);
    });
    it("Correctly aligns an alert that starts before the day and ends after it", () => {
      const day = makeDayWithHours(
        "2024-09-09T06:00:00-04:00",
        24,
        "America/New_York",
      );
      const alerts = {
        items: [
          {
            id: "id",
            event: "test",
            onset: dayjs
              .utc("2024-09-08T15:32:00-04:00")
              .tz("America/New_York"),
            finish: dayjs
              .utc("2024-09-10T17:55:00-04:00")
              .tz("America/New_York"),
            metadata: {
              level: {
                text: "other",
              },
            },
          },
        ],
      };

      const expected = {
        metadata: {
          count: 1,
          highest: "other",
        },
        items: [
          {
            id: "id",
            offset: 0,
            duration: 24,
            event: "test",
            remainder: 0,
            level: "other",
          },
        ],
      };

      // Modifies day in place
      alignAlertsToDaily(alerts, [day]);

      expect(day.alerts).to.eql(expected);
    });
    it("Ignores an alert that both starts and ends before the day start", () => {
      const day = makeDayWithHours(
        "2024-09-09T06:00:00-04:00",
        24,
        "America/New_York",
      );
      const alerts = {
        items: [
          {
            id: "id",
            event: "test",
            onset: dayjs
              .utc("2024-09-06T15:32:00-04:00")
              .tz("America/New_York"),
            finish: dayjs
              .utc("2024-09-09T05:59:00-04:00")
              .tz("America/New_York"),
            metadata: {
              level: {
                text: "other",
              },
            },
          },
        ],
      };

      const expected = {
        metadata: {
          count: 0,
          highest: undefined,
        },
        items: [],
      };

      // Modifies day in place
      alignAlertsToDaily(alerts, [day]);

      expect(day.alerts).to.eql(expected);
    });
    it("Ignores an alert that starts after the day has already ended", () => {
      const day = makeDayWithHours(
        "2024-09-09T06:00:00-04:00",
        24,
        "America/New_York",
      );
      const alerts = {
        items: [
          {
            id: "id",
            event: "test",
            onset: dayjs
              .utc("2024-09-11T15:32:00-04:00")
              .tz("America/New_York"),
            finish: dayjs
              .utc("2024-09-11T17:55:00-04:00")
              .tz("America/New_York"),
            metadata: {
              level: {
                text: "other",
              },
            },
          },
        ],
      };

      const expected = {
        metadata: {
          count: 0,
          highest: undefined,
        },
        items: [],
      };

      // Modifies day in place
      alignAlertsToDaily(alerts, [day]);

      expect(day.alerts).to.eql(expected);
    });
    it("Alert that spans multiple days is shown in all the affected days", () => {
      const days = [
        makeDayWithHours("2024-09-09T06:00:00-04:00", 24, "America/New_York"),
        makeDayWithHours("2024-09-10T06:00:00-04:00", 24, "America/New_York"),
        makeDayWithHours("2024-09-11T06:00:00-04:00", 24, "America/New_York"),
      ];

      const alerts = {
        items: [
          {
            id: "id",
            event: "test",
            onset: dayjs
              .utc("2024-09-09T15:32:00-04:00")
              .tz("America/New_York"),
            finish: dayjs
              .utc("2024-09-11T07:55:00-04:00")
              .tz("America/New_York"),
            metadata: {
              level: {
                text: "other",
              },
            },
          },
        ],
      };

      const expectedDay1 = {
        metadata: {
          count: 1,
          highest: "other",
        },
        items: [
          {
            id: "id",
            offset: 9,
            duration: 15,
            event: "test",
            remainder: 0,
            level: "other",
          },
        ],
      };
      const expectedDay2 = {
        metadata: {
          count: 1,
          highest: "other",
        },
        items: [
          {
            id: "id",
            offset: 0,
            duration: 24,
            event: "test",
            remainder: 0,
            level: "other",
          },
        ],
      };
      const expectedDay3 = {
        metadata: {
          count: 1,
          highest: "other",
        },
        items: [
          {
            id: "id",
            offset: 0,
            duration: 2,
            event: "test",
            remainder: 22,
            level: "other",
          },
        ],
      };

      // Modifies day in place
      alignAlertsToDaily(alerts, days);

      expect(days[0].alerts).to.eql(expectedDay1);
      expect(days[1].alerts).to.eql(expectedDay2);
      expect(days[2].alerts).to.eql(expectedDay3);
    });
    it("The highest level of alert is noted", () => {
      const day = makeDayWithHours(
        "2024-09-09T06:00:00-04:00",
        24,
        "America/New_York",
      );
      const alerts = {
        items: [
          {
            id: "id",
            event: "test",
            onset: dayjs
              .utc("2024-09-09T15:32:00-04:00")
              .tz("America/New_York"),
            finish: dayjs
              .utc("2024-09-09T17:55:00-04:00")
              .tz("America/New_York"),
            metadata: {
              level: {
                text: "other",
              },
            },
          },
          {
            id: "id2",
            event: "tornado warning",
            onset: dayjs
              .utc("2024-09-09T16:32:00-04:00")
              .tz("America/New_York"),
            finish: dayjs
              .utc("2024-09-09T18:55:00-04:00")
              .tz("America/New_York"),
            metadata: {
              level: {
                text: "warning",
              },
            },
          },
        ],
      };

      const expected = {
        metadata: {
          count: 2,
          highest: "warning",
        },
        items: [
          {
            id: "id",
            offset: 9,
            duration: 3,
            event: "test",
            remainder: 12,
            level: "other",
          },
          {
            id: "id2",
            offset: 10,
            duration: 3,
            event: "tornado warning",
            remainder: 11,
            level: "warning",
          },
        ],
      };

      // Modifies day in place
      alignAlertsToDaily(alerts, [day]);

      expect(day.alerts).to.eql(expected);
    });
  });
});
