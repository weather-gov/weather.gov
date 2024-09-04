import sinon from "sinon";
import { expect } from "chai";
import * as mariadb from "mariadb";

describe("alert data module", () => {
  const sandbox = sinon.createSandbox();
  const db = {
    query: sandbox.stub(),
    end: () => Promise.resolve(),
  };

  const response = { json: sandbox.stub() };

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();

    mariadb.default.createConnection.resolves(db);
    fetch.resolves(response);
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

    describe("the main alert function", () => {
      it("does not store alerts that are not land-based", async () => {
        const shared = {
          sent: new Date().toISOString(),
          effective: new Date().toISOString(),
          onset: new Date().toISOString(),
          expires: new Date().toISOString(),
          onset: new Date().toISOString(),
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

        // Then the default export will find the applicable alerts for us, but it
        // will do some database queries to find geospatial intersections. Gotta
        // mock that too.
        db.query.resolves([{ yes: 1 }]);

        const alerts = await alertHandler.default({
          grid: { geometry: [] },
          place: { timezone: "America/Chicago" },
        });

        const kinds = alerts.items.map(({ metadata: { kind } }) => kind);
        expect(kinds).to.have.same.members(["land", "land", "land"]);
      });
    });
  });
});
