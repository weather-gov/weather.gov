import sinon from "sinon";
import { expect } from "chai";
import dayjs from "../../util/day.js";
import { updateAlerts } from "./backgroundUpdateTask.js";
import { AlertsCache } from "./cache.js";

describe("alert background processing module", () => {
  const sandbox = sinon.createSandbox();

  const response = { status: 200, json: sandbox.stub() };
  const parent = { postMessage: sandbox.stub() };

  let getHashesStub;
  let addAlertStub;
  let removeAlertsStub;
  let storedHashes;
  let storedAlerts;

  beforeEach(() => {
    response.status = 200;

    storedHashes = [];
    storedAlerts = {};
    getHashesStub = sandbox.stub(AlertsCache.prototype, "getHashes");
    getHashesStub.callsFake(() =>storedHashes);
    addAlertStub = sandbox.stub(AlertsCache.prototype, "add");
    addAlertStub.callsFake((hash, alert, geometry, alertKind) =>{
      storedHashes.push(hash);
      storedAlerts[hash] = [hash, alert, geometry, alertKind];
    });
    removeAlertsStub = sandbox.stub(AlertsCache.prototype, "removeByHashes");
    removeAlertsStub.callsFake((hashes) =>{
      hashes.forEach(hash => {
        const idx = storedHashes.indexOf(hash);
        if(idx >= 0){
          storedHashes.splice(idx, 1);
          delete storedAlerts[hash];
        }
      });
    });

    fetch.resolves(response);
  });

  afterEach(() => {
    // Clear out the background processor's internal cache.
    response.json.resolves({ features: [] });
    sandbox.resetBehavior();
    sandbox.resetHistory();
    getHashesStub.restore();
    addAlertStub.restore();
    removeAlertsStub.restore();
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

      await updateAlerts({ parent });

      response.json.resolves({
        features: [
          // Clone the alerts because the updater mutates them.
          JSON.parse(JSON.stringify(alert1)),
          JSON.parse(JSON.stringify(alert2)),
        ],
      });

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

      response.json.resolves({
        features: [alert1],
      });

      await updateAlerts({ parent });

      response.json.resolves({
        features: [],
      });

      await updateAlerts({ parent });

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

      await updateAlerts({ parent });

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

    await updateAlerts({ parent });

    expect(storedHashes).to.have.length(4);
    expect(Object.values(storedAlerts)).to.have.length(4);

    const geometries = Object.values(storedAlerts).map(alertInfo => alertInfo[2]);

    expect(geometries).to.eql(["geo", null, "geo", "geo"]);
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

    await updateAlerts({ parent });

    const [ _, alert ] = Object.values(storedAlerts)[0];

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

    await updateAlerts({ parent });

    expect(storedHashes).to.have.length(1);

    const [ _, alert ] = Object.values(storedAlerts)[0];
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

    await updateAlerts({ parent });

    expect(storedHashes).to.have.length(1);

    const [ _, alert ] = Object.values(storedAlerts)[0];
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
    fetch.rejects();

    await updateAlerts({ parent });

    expect(parent.postMessage.calledWith({ action: "error" })).to.be.true;
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
      await updateAlerts({ parent });

      const [ _, alert ] = Object.values(storedAlerts)[0];
      const { ends, finish } = alert;

      expect(ends.isSame(finish)).to.be.true;
    });

    it("if the alert does not have an ends property but does have expires", async () => {
      alertResponse.features[0].properties.ends = null;
      alertResponse.features[0].properties.expires = "2430-04-03T12:00:00Z";
      response.json.resolves(alertResponse);
      await updateAlerts({ parent });

      const [ _, alert ] = Object.values(storedAlerts)[0];
      const { expires, finish } = alert;
      expect(expires.isSame(finish)).to.be.true;
    });

    it("if the alert has neither ends nor expires properties", async () => {
      alertResponse.features[0].properties.ends = null;
      alertResponse.features[0].properties.expires = null;
      response.json.resolves(alertResponse);
      await updateAlerts({ parent });

      const [ _, alert ] = Object.values(storedAlerts)[0];
      const { finish } = alert;

      expect(finish).to.be.null;
    });
  });
});
