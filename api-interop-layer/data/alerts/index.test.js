import sinon from "sinon";
import { expect } from "chai";
import * as mariadb from "mariadb";
import dayjs from "../../util/day.js";
import { alignAlertsToDaily } from "./index.js";

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
                sent: new Date().toISOString(),
                effective: new Date().toISOString(),
                onset: new Date().toISOString(),
                expires: new Date().toISOString(),
                ends: new Date().toISOString(),
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
      it("does not store alerts that are not land-based", async () => {
        const shared = {
          sent: new Date().toISOString(),
          effective: new Date().toISOString(),
          onset: new Date().toISOString(),
          expires: new Date().toISOString(),
          ends: new Date().toISOString(),
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
                sent: new Date().toISOString(),
                effective: new Date().toISOString(),
                onset: new Date().toISOString(),
                expires: new Date().toISOString(),
                ends: new Date().toISOString(),
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
                sent: new Date().toISOString(),
                effective: new Date().toISOString(),
                onset: new Date().toISOString(),
                expires: new Date().toISOString(),
                ends: new Date().toISOString(),
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

      describe("correctly sets the highest alert level", () => {
        const getAlert = (type) => ({
          geometry: "geo",
          properties: {
            id: "one",
            sent: new Date().toISOString(),
            effective: new Date().toISOString(),
            onset: new Date().toISOString(),
            expires: new Date().toISOString(),
            ends: new Date().toISOString(),
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
              sent: new Date().toISOString(),
              effective: new Date().toISOString(),
              onset: new Date().toISOString(),
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
      const day = {
        hours: Array(24).map((_, idx) => {
          // 6am to 6am
          let time = dayjs.utc("2024-09-09T06:00:00-04:00").tz("America/New_York");
          time = time.add(idx, "hours");
          return {
            time
          };
        })
      };
      const alerts = {
        items: [{
          id: "id",
          event: "test",
          onset: dayjs.utc("2024-09-09T15:32:00-04:00").tz("America/New_York"),
          finish: dayjs.utc("2024-09-09T17:55:00-04:00").tz("America/New_York")
        }]
      };

      const expected = {
        metadata: {
          count: 0,
          highest: "other"
        },
        items: [{
          offset: 8,
          duration: 4,
          event: "test",
          remainder: 12
        }]
      };

      const actual = alignAlertsToDaily(alerts, [day]);

      expect(expected).to.eql(actual);
    });
  });
});
