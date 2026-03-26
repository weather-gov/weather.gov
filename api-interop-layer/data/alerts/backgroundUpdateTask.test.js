import { createHash } from "node:crypto";
import sinon from "sinon";
import { expect } from "chai";
import dayjs from "../../util/day.js";
import { Client as MockClient } from "undici";
import { updateAlerts, fetchAlertFeatures } from "./backgroundUpdateTask.js";
import { AlertsCache } from "./cache.js";

describe("alert background processing module", () => {
  let response,
    parent,
    getHashesStub,
    addAlertStub,
    removeAlertsStub,
    storedHashes,
    storedAlerts,
    sandbox;

  before(() => {
    sandbox = sinon.createSandbox();

    response = {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: {
        text: sandbox.stub(),
        dump: sandbox.stub().resolves(),
      },
    };

    parent = { postMessage: sandbox.stub() };
  });

  beforeEach(() => {
    response.statusCode = 200;
    response.headers = { "content-type": "application/json" };

    storedHashes = [];
    storedAlerts = {};
    getHashesStub = sandbox.stub(AlertsCache.prototype, "getHashes");
    getHashesStub.callsFake(() => storedHashes);
    addAlertStub = sandbox.stub(AlertsCache.prototype, "add");
    addAlertStub.callsFake(
      ({ hash, alert, counties, states, geometry, alertKind }) => {
        storedHashes.push(hash);
        storedAlerts[hash] = [
          hash,
          alert,
          geometry,
          alertKind,
          counties,
          states,
        ];
      },
    );
    removeAlertsStub = sandbox.stub(AlertsCache.prototype, "removeByHashes");
    removeAlertsStub.callsFake((hashes) => {
      hashes.forEach((hash) => {
        const idx = storedHashes.indexOf(hash);
        if (idx >= 0) {
          storedHashes.splice(idx, 1);
          delete storedAlerts[hash];
        }
      });
    });

    sandbox.stub(MockClient.prototype, "request");
    MockClient.prototype.request.resolves(response);
  });

  afterEach(() => {
    response.body.text.resolves(JSON.stringify({ features: [] }));
    sandbox.resetBehavior();
    sandbox.resetHistory();
    getHashesStub.restore();
    addAlertStub.restore();
    removeAlertsStub.restore();
    MockClient.prototype.request.restore();
  });

  after(() => {
    sandbox.restore();
  });

  describe("creates alert hashes", () => {
    const alert = {
      geometry: "geo",
      properties: {
        id: "nonstandard",
        event: "Severe Thunderstorm Warning",
        sent: dayjs().subtract(1, "minute").toISOString(),
        effective: dayjs().subtract(1, "minute").toISOString(),
        onset: dayjs().subtract(1, "minute").toISOString(),
        expires: dayjs().add(1, "minute").toISOString(),
        ends: dayjs().add(1, "minute").toISOString(),
      },
    };

    const hash = createHash("sha256")
      .update(JSON.stringify(alert.properties))
      .digest("base64");

    beforeEach(() => {
      response.body.text.resolves(
        JSON.stringify({
          features: [alert],
        }),
      );
    });

    it("derives an alert hash", async () => {
      await updateAlerts({ parent });

      const [_, expected] = Object.values(storedAlerts)[0];

      expect(expected.hash).to.equal(hash);
    });

    it("sets the alert ID to the hash, if no ID is present", async () => {
      await updateAlerts({ parent });

      const [_, expected] = Object.values(storedAlerts)[0];

      expect(expected.id).to.equal(expected.hash);
    });
  });

  describe("Does not save the same alert twice on repeated call", () => {
    it("does not post the same alert twice", async () => {
      const alert1 = {
        geometry: "geo",
        properties: {
          id: "urn:oid:2.49.0.1.840.alert1",
          event: "Severe Thunderstorm Warning",
          sent: dayjs().subtract(1, "minute").toISOString(),
          effective: dayjs().subtract(1, "minute").toISOString(),
          onset: dayjs().subtract(1, "minute").toISOString(),
          expires: dayjs().add(1, "minute").toISOString(),
          ends: dayjs().add(1, "minute").toISOString(),
        },
      };

      const alert2 = {
        geometry: "geo",
        properties: {
          ...alert1,
          id: "urn:oid:2.49.0.1.840.alert2",
          event: "Tornado Warning",
        },
      };
      response.body.text.resolves(
        JSON.stringify({
          // Clone the alerts because the updater mutates them.
          features: [JSON.parse(JSON.stringify(alert1))],
        }),
      );

      await updateAlerts({ parent });

      response.body.text.resolves(
        JSON.stringify({
          features: [
            // Clone the alerts because the updater mutates them.
            JSON.parse(JSON.stringify(alert1)),
            JSON.parse(JSON.stringify(alert2)),
          ],
        }),
      );

      await updateAlerts({ parent });

      expect(storedHashes).to.have.length(2);
      expect(Object.values(storedAlerts)).to.have.length(2);
    });

    it("removes alerts that are gone in the next pass", async () => {
      const alert1 = {
        geometry: "geo",
        properties: {
          id: "urn:oid:2.49.0.1.840.alert1",
          event: "Severe Thunderstorm Warning",
          sent: dayjs().subtract(1, "minute").toISOString(),
          effective: dayjs().subtract(1, "minute").toISOString(),
          onset: dayjs().subtract(1, "minute").toISOString(),
          expires: dayjs().add(1, "minute").toISOString(),
          ends: dayjs().add(1, "minute").toISOString(),
        },
      };

      response.body.text.resolves(
        JSON.stringify({
          features: [alert1],
        }),
      );

      await updateAlerts({ parent });

      response.body.text.resolves(
        JSON.stringify({
          features: [],
        }),
      );

      await updateAlerts({ parent });

      expect(storedHashes).to.have.length(0);
      expect(Object.values(storedAlerts)).to.have.length(0);
    });
  });

  describe("does not store alerts that have ended", () => {
    let past,
      times;

    before(() => {
      // 24 hours ago...
      past = new Date(Date.now() - 86_400_000).toISOString();
  
      times = {
        sent: dayjs().subtract(1, "minute").toISOString(),
        effective: dayjs().subtract(1, "minute").toISOString(),
        onset: dayjs().subtract(1, "minute").toISOString(),
        expires: dayjs().add(1, "minute").toISOString(),
        ends: dayjs().add(1, "minute").toISOString(),
      };
    });

    it("if the alert has an end time in the past", async () => {
      response.body.text.resolves(
        JSON.stringify({
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
        }),
      );

      await updateAlerts({ parent });

      expect(storedHashes).to.have.length(0);
      expect(Object.values(storedAlerts)).to.have.length(0);
    });

    it("if the alert does not have an end time and the expire time is in the past", async () => {
      response.body.text.resolves(
        JSON.stringify({
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
        }),
      );
      await updateAlerts({ parent });

      expect(storedHashes).to.have.length(0);
      expect(Object.values(storedAlerts)).to.have.length(0);
    });
  });

  it("stores land based alerts without geometry", async () => {
    const shared = {
      sent: dayjs().subtract(1, "minute").toISOString(),
      effective: dayjs().subtract(1, "minute").toISOString(),
      onset: dayjs().subtract(1, "minute").toISOString(),
      expires: dayjs().add(1, "minute").toISOString(),
      ends: dayjs().add(1, "minute").toISOString(),
    };

    response.body.text.resolves(
      JSON.stringify({
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
      }),
    );

    await updateAlerts({ parent });

    expect(storedHashes).to.have.length(4);
    expect(Object.values(storedAlerts)).to.have.length(4);

    const geometries = Object.values(storedAlerts).map(
      (alertInfo) => alertInfo[2],
    );

    expect(geometries).to.eql([
      { shape: "geo" },
      null,
      { shape: "geo" },
      { shape: "geo" },
    ]);
  });

  it("derives an alert ID", async () => {
    response.body.text.resolves(
      JSON.stringify({
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
      }),
    );

    await updateAlerts({ parent });

    const [_, alert] = Object.values(storedAlerts)[0];

    expect(alert.id).to.equal("part1_part2_part3");
  });

  it("stores unknown alert types with appropriate metadata", async () => {
    response.body.text.resolves(
      JSON.stringify({
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
      }),
    );

    await updateAlerts({ parent });

    expect(storedHashes).to.have.length(1);

    const [_, alert] = Object.values(storedAlerts)[0];
    const { event, metadata } = alert;

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

  it("prioritizes unknown 'evacuation' alerts correctly", async () => {
    response.body.text.resolves(
      JSON.stringify({
        features: [
          {
            geometry: "geo",
            properties: {
              id: "one",
              event: "Pasta Sauce Evacuation Emergency",
              sent: dayjs().subtract(1, "minute").toISOString(),
              effective: dayjs().subtract(1, "minute").toISOString(),
              onset: dayjs().subtract(1, "minute").toISOString(),
              expires: dayjs().add(1, "minute").toISOString(),
              ends: dayjs().add(1, "minute").toISOString(),
            },
          },
        ],
      }),
    );

    await updateAlerts({ parent });

    expect(storedHashes).to.have.length(1);

    const [_, alert] = Object.values(storedAlerts)[0];
    const { event, metadata } = alert;

    expect(event).to.equal("Pasta Sauce Evacuation Emergency");
    expect(metadata).to.eql({
      level: {
        priority: 2048,
        text: "other",
      },
      kind: "land",
      priority: 8192,
    });
  });

  it("posts an error if it encounters a problem", async () => {
    MockClient.prototype.request.rejects(new Error("Net error"));

    await updateAlerts({ parent });

    expect(parent.postMessage.calledWith({ action: "error" })).to.equal(true);
  });

  describe("computes the alert finish time", () => {
    let alertResponse;

    before(() => {
      alertResponse = {
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
    });

    it("if the alert has an ends property", async () => {
      alertResponse.features[0].properties.ends = "2430-04-03T12:00:00Z";
      alertResponse.features[0].properties.expires = null;
      response.body.text.resolves(JSON.stringify(alertResponse));
      await updateAlerts({ parent });

      const [_, alert] = Object.values(storedAlerts)[0];
      const { ends, finish } = alert;

      expect(ends.isSame(finish)).to.be.true;
    });

    it("if the alert does not have an ends property but does have expires", async () => {
      alertResponse.features[0].properties.ends = null;
      alertResponse.features[0].properties.expires = "2430-04-03T12:00:00Z";
      response.body.text.resolves(JSON.stringify(alertResponse));
      await updateAlerts({ parent });

      const [_, alert] = Object.values(storedAlerts)[0];
      const { expires, finish } = alert;
      expect(expires.isSame(finish)).to.be.true;
    });

    it("if the alert has neither ends nor expires properties", async () => {
      alertResponse.features[0].properties.ends = null;
      alertResponse.features[0].properties.expires = null;
      response.body.text.resolves(JSON.stringify(alertResponse));
      await updateAlerts({ parent });

      const [_, alert] = Object.values(storedAlerts)[0];
      const { finish } = alert;

      expect(finish).to.be.null;
    });
  });

  describe("#fetchAlertFeatures", () => {
    it("returns an error object with a cause when responseJSON returns an object with error", async () => {
      const mockResponse = {
        statusCode: 422,
        statusText: "whoopsie!",
        headers: { "content-type": "application/json" },
        body: {
          text: sandbox.stub().resolves("{}"),
          dump: sandbox.stub().resolves(),
        },
      };

      MockClient.prototype.request.resolves(mockResponse);

      const result = await fetchAlertFeatures();

      expect(result.error).to.be.true;
      expect(result.status).to.equal(422);
    });

    it("returns an error object with a cause when the underlying request throws an error", async () => {
      const err = new Error("hello");
      MockClient.prototype.request.throws(err);

      const result = await fetchAlertFeatures();

      expect(result.error).to.be.true;
      expect(result.message).to.equal("hello");
    });

    it("returns a list of features (alerts) when successful", async () => {
      const alert = {
        geometry: "geo",
        properties: {
          id: "nonstandard",
          event: "Severe Thunderstorm Warning",
          sent: dayjs().subtract(1, "minute").toISOString(),
          effective: dayjs().subtract(1, "minute").toISOString(),
          onset: dayjs().subtract(1, "minute").toISOString(),
          expires: dayjs().add(1, "minute").toISOString(),
          ends: dayjs().add(1, "minute").toISOString(),
        },
      };

      const mockResponse = {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: {
          text: sandbox.stub().resolves(JSON.stringify({ features: [alert] })),
          dump: sandbox.stub().resolves(),
        },
      };
      MockClient.prototype.request.resolves(mockResponse);

      const result = await fetchAlertFeatures();

      expect(result.length).to.equal(1);

      expect(result[0].geometry).to.equal(alert.geometry);
      expect(result[0].properties.id).to.equal(alert.properties.id);
      expect(result[0].properties.event).to.equal(alert.properties.event);
      expect(dayjs.isDayjs(result[0].properties.sent)).to.be.true;
    });
  });
});
