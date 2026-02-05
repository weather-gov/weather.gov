// cleaned up imports
import { createHash } from "node:crypto";
import sinon from "sinon";
import { expect } from "chai";
import dayjs from "../../util/day.js";
import { updateAlerts } from "./backgroundUpdateTask.js";
import { AlertsCache } from "./cache.js";

describe("alert background processing module", () => {
  const sandbox = sinon.createSandbox();

  const response = { status: 200, json: sandbox.stub() };
  const parent = { postMessage: sandbox.stub() };

  // mock dependencies
  const mockDb = {};
  const mockGenerator = sinon.stub().resolves({ shape: "geo" });

  let getHashesStub;
  let addAlertStub;
  let removeAlertsStub;
  let storedHashes;
  let storedAlerts: any;

  beforeEach(() => {
    sandbox.stub(global, "fetch");
    response.status = 200;

    storedHashes = [];
    storedAlerts = {};
    getHashesStub = sandbox.stub(AlertsCache.prototype, "getHashes");
    getHashesStub.callsFake(() => storedHashes);
    addAlertStub = sandbox.stub(AlertsCache.prototype, "add");
    addAlertStub.callsFake(({ hash, alert, counties, states, geometry, alertKind }: any) => {
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
    removeAlertsStub.callsFake((hashes: any) => {
      hashes.forEach((hash: any) => {
        const idx = storedHashes.indexOf(hash);
        if (idx >= 0) {
          storedHashes.splice(idx, 1);
          delete storedAlerts[hash];
        }
      });
    });

    (fetch as any).resolves(response);
  });

  afterEach(() => {
    // Clear out the background processor's internal cache.
    response.json.resolves({ features: [] });
    response.json.resolves({ features: [] });
    sandbox.restore();
    getHashesStub.restore();
    addAlertStub.restore();
    removeAlertsStub.restore();
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
      response.json.resolves({
        features: [alert],
      });
    });

    it("derives an alert hash", async () => {
      await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

      const [_, expected] = Object.values(storedAlerts)[0] as any;

      expect(expected.hash).to.equal(hash);
    });

    it("sets the alert ID to the hash, if no ID is present", async () => {
      await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

      const [_, expected] = Object.values(storedAlerts)[0] as any;

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
      response.json.resolves({
        // Clone the alerts because the updater mutates them.
        features: [JSON.parse(JSON.stringify(alert1))],
      });

      await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

      response.json.resolves({
        features: [
          // Clone the alerts because the updater mutates them.
          JSON.parse(JSON.stringify(alert1)),
          JSON.parse(JSON.stringify(alert2)),
        ],
      });

      await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

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

      response.json.resolves({
        features: [alert1],
      });

      await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

      response.json.resolves({
        features: [],
      });

      await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

      expect(storedHashes).to.have.length(0);
      expect(Object.values(storedAlerts)).to.have.length(0);
    });
  });

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

      await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

      expect(storedHashes).to.have.length(0);
      expect(Object.values(storedAlerts)).to.have.length(0);
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
      await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

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

    await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

    expect(storedHashes).to.have.length(4);
    expect(Object.values(storedAlerts)).to.have.length(4);

    const geometries = Object.values(storedAlerts).map((alertInfo: any) => alertInfo[2],
    );

    expect(geometries).to.eql([
      { shape: "geo" },
      null,
      { shape: "geo" },
      { shape: "geo" },
    ]);
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

    await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

    const [_, alert] = Object.values(storedAlerts)[0] as any;

    expect(alert.id).to.equal("part1_part2_part3");
  });

  it("stores unknown alert types with appropriate metadata", async () => {
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

    await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

    expect(storedHashes).to.have.length(1);

    const [_, alert] = Object.values(storedAlerts)[0] as any;
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
    response.json.resolves({
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
    });

    await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

    expect(storedHashes).to.have.length(1);

    const [_, alert] = Object.values(storedAlerts)[0] as any;
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
    (fetch as any).rejects();

    await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

    expect(parent.postMessage.calledWith({ action: "error" })).to.be.true;
  });

  describe("computes the alert finish time", () => {
    const alertResponse: any = {
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
      await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

      const [_, alert] = Object.values(storedAlerts)[0] as any;
      const { ends, finish } = alert;

      expect(ends.isSame(finish)).to.be.true;
    });

    it("if the alert does not have an ends property but does have expires", async () => {
      alertResponse.features[0].properties.ends = null;
      alertResponse.features[0].properties.expires = "2430-04-03T12:00:00Z";
      response.json.resolves(alertResponse);
      await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

      const [_, alert] = Object.values(storedAlerts)[0] as any;
      const { expires, finish } = alert;
      expect(expires.isSame(finish)).to.be.true;
    });

    it("if the alert has neither ends nor expires properties", async () => {
      alertResponse.features[0].properties.ends = null;
      alertResponse.features[0].properties.expires = null;
      response.json.resolves(alertResponse);
      await updateAlerts({ parent, database: mockDb, generator: mockGenerator });

      const [_, alert] = Object.values(storedAlerts)[0] as any;
      const { finish } = alert;

      expect(finish).to.be.null;
    });
  });
});
