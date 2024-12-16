import sinon from "sinon";
import { expect } from "chai";
import dayjs from "../../util/day.js";
import { alignAlertsToDaily } from "./utils.js";
import alertHandler, { updateFromBackground } from "./index.js";
import alertKinds from "./kinds.js";
import { AlertsCache } from "./cache.js";

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

  const response = { status: 200, json: sandbox.stub() };
  let getIntersection;

  beforeEach(() => {
    response.status = 200;
    sandbox.resetBehavior();
    sandbox.resetHistory();
    getIntersection = sandbox.stub(AlertsCache.prototype, "getIntersectingAlerts");

    fetch.resolves(response);
  });

  afterEach(() => {
    getIntersection.restore();
  });

  describe("after initial setup", () => {
    describe("error handling", () => {
      beforeEach(async () => {
        response.json.resetBehavior();
        response.json.resetHistory();
        getIntersection.callsFake(function(geometry){
          console.log("get intersecting alerts called!");
          return Promise.resolve([]);
        });
      });

      afterEach(() => {
        updateFromBackground({ action: "remove", hash: "test" });
      });

      it("updates metadata but does NOT update alerts if there is an error", async () => {
        const before = await alertHandler({
          point: { latitude: 3, longitude: 4 },
          place: { timezone: "America/Chicago" },
        });

        updateFromBackground({ action: "error" });

        const actual = await alertHandler({
          point: { latitude: 3, longitude: 4 },
          place: { timezone: "America/Chicago" },
        });

        expect(actual.metadata).to.eql({ ...before.metadata, error: true });
      });

      it("clears the error flag after a successful update", async () => {
        updateFromBackground({ action: "error" });
        updateFromBackground({ action: "remove", hash: "test" });

        const actual = await alertHandler({
          point: { latitude: 3, longitude: 4 },
          place: { timezone: "America/Chicago" },
        });

        expect(actual.metadata.error).to.be.false;
      });
    });

    describe("the main alert function", () => {
      describe("correctly formats alert timing information", async () => {
        beforeEach(() => {
          // Use a fixed date. The timezone here is UTC-600, or Mountain
          // Daylight. Our tests below will be in Central Daylight. Having these
          // be different assures we're propertly using the user's timezone.
          const alertDay = dayjs.utc("2024-09-03T07:13:00-0600");

          const start = alertDay;
          const end = alertDay.add(2, "hours").add(31, "minutes");

          const alert = {
            id: "one",
            event: "Severe Meatballstorm Warning",
            sent: dayjs().subtract(1, "minute"),
            effective: dayjs().subtract(1, "minute"),
            onset: start,
            expires: end,
            ends: end,
            finish: end,
            metadata: {
              level: { priority: 1 },
            },
            geometry: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [0, 0],
                    [2, 0],
                    [2, 2],
                    [0, 2],
                    [0, 0],
                  ],
                ],
              },
            },
          };

          getIntersection.callsFake(function(){
            return Promise.resolve([alert]);
          });
        });

        afterEach(() => {
          getIntersection.resetBehavior();
          getIntersection.resetHistory();
        });

        it("formats the start time", async () => {
          const {
            items: [alert],
          } = await alertHandler({
            point: { latitude: 1, longitude: 1 },
            place: { timezone: "America/Chicago" },
          });

          expect(alert.timing.start).to.equal("Tuesday 09/03 8:13 AM CDT");
        });

        it("formats the end time", async () => {
          const {
            items: [alert],
          } = await alertHandler({
            point: { latitude: 1, longitude: 1 },
            place: { timezone: "America/Chicago" },
          });

          expect(alert.timing.end).to.equal("Tuesday 09/03 10:44 AM CDT");
        });
      });

      describe("correctly sets the highest alert level", () => {
        const addAlerts = (...types) =>
          types.map((type) => {
            const hash = `${Date.now()}${Math.random()}`;
            const time = dayjs();

            const alert = {
              geometry: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [0, 0],
                      [2, 0],
                      [2, 2],
                      [0, 2],
                      [0, 0],
                    ],
                  ],
                },
              },
              id: "one",
              sent: time,
              effective: time,
              onset: time,
              expires: time,
              ends: time,
              finish: time,
              event: type,
              metadata: alertKinds.get(type.toLowerCase()),
            };

            updateFromBackground({ action: "add", hash, alert });
            return alert;
          });

        afterEach(() => {
          getIntersection.resetBehavior();
          getIntersection.resetHistory();
        });

        it("when one of them is a warning", async () => {
          const alerts = addAlerts(
            "Severe Thunderstorm Warning",
            "Severe Thunderstorm Watch",
            "severe weather statement",
            "avalanche advisory",
          );

          getIntersection.resolves(alerts);

          const { highestLevel: actual } = await alertHandler({
            point: { latitude: 1, longitude: 1 },
            place: { timezone: "America/Chicago" },
          });

          expect(actual).to.equal("warning");
        });

        it("when there are no warnings, but at least one watch", async () => {
          const alerts = addAlerts(
            "Severe Thunderstorm Watch",
            "severe weather statement",
            "avalanche advisory",
          );

          getIntersection.resolves(alerts);

          const { highestLevel: actual } = await alertHandler({
            point: { latitude: 1, longitude: 1 },
            place: { timezone: "America/Chicago" },
          });

          expect(actual).to.equal("watch");
        });

        it("when there are no warnings or watches", async () => {
          const alerts = addAlerts(
            "severe weather statement",
            "avalanche advisory",
          );

          getIntersection.resolves(alerts);

          const { highestLevel: actual } = await alertHandler({
            point: { latitude: 1, longitude: 1 },
            place: { timezone: "America/Chicago" },
          });

          expect(actual).to.equal("other");
        });
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
