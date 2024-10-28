import sinon from "sinon";
import { expect } from "chai";
import dayjs from "../../util/day.js";
import { updateAlerts } from "./backgroundUpdateTask.js";

describe("alert background processing module", () => {
  const sandbox = sinon.createSandbox();

  const response = { status: 200, json: sandbox.stub() };
  const parent = { postMessage: sandbox.stub() };

  beforeEach(() => {
    response.status = 200;
    sandbox.resetBehavior();
    sandbox.resetHistory();

    fetch.resolves(response);
  });

  afterEach(() => {
    // Clear out the background processor's internal cache.
    response.json.resolves({ features: [] });
    return updateAlerts({ parent });
  });

  describe("posts alerts appropriately", () => {
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

      expect(parent.postMessage.callCount).to.equal(2);

      expect(parent.postMessage.args[0][0].action).to.equal("add");
      expect(parent.postMessage.args[0][0].alert.id).to.equal("1_840_alert1");

      expect(parent.postMessage.args[1][0].action).to.equal("add");
      expect(parent.postMessage.args[1][0].alert.id).to.equal("1_840_alert2");
    });

    it("posts a removal for alerts that are gone", async () => {
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

      expect(parent.postMessage.callCount).to.equal(2);

      expect(parent.postMessage.args[0][0].action).to.equal("add");
      expect(parent.postMessage.args[0][0].alert.id).to.equal("1_840_alert1");

      expect(parent.postMessage.args[1][0].action).to.equal("remove");
      expect(parent.postMessage.args[1][0].hash).to.equal(
        parent.postMessage.args[0][0].hash,
      );
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

      expect(parent.postMessage.called).to.be.false;
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

      expect(parent.postMessage.called).to.be.false;
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

    await updateAlerts({ parent });

    expect(parent.postMessage.callCount).to.equal(3);

    const kinds = parent.postMessage.args.map(
      ([{ alert }]) => alert.metadata.kind,
    );

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

    await updateAlerts({ parent });

    const { alert } = parent.postMessage.args[0][0];

    expect(alert.id).to.equal("part1_part2_part3");
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

    await updateAlerts({ parent });

    const {
      alert: { event, metadata },
    } = parent.postMessage.args[0][0];

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

      const {
        alert: { ends, finish },
      } = parent.postMessage.args[0][0];
      expect(ends.isSame(finish)).to.be.true;
    });

    it("if the alert does not have an ends property but does have expires", async () => {
      alertResponse.features[0].properties.ends = null;
      alertResponse.features[0].properties.expires = "2430-04-03T12:00:00Z";
      response.json.resolves(alertResponse);
      await updateAlerts({ parent });

      const {
        alert: { expires, finish },
      } = parent.postMessage.args[0][0];
      expect(expires.isSame(finish)).to.be.true;
    });

    it("if the alert has neither ends nor expires properties", async () => {
      alertResponse.features[0].properties.ends = null;
      alertResponse.features[0].properties.expires = null;
      response.json.resolves(alertResponse);
      await updateAlerts({ parent });

      const {
        alert: { finish },
      } = parent.postMessage.args[0][0];

      expect(finish).to.be.null;
    });
  });
});
