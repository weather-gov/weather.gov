import { expect } from "chai";
import { createSandbox } from "sinon";
import undici from "undici";
import getDataForBriefing from "./briefing.js";

describe("briefing module", () => {
  const sandbox = createSandbox();
  const response = {
    statusCode: 200,
    body: { json: sandbox.stub() },
  };

  beforeEach(() => {
    response.status = 200;
    undici.request.resolves(response);
  });

  describe("returns data if everything goes well", () => {
    it("for one briefing", async () => {
      response.body.json.resolves({
        "@context": {
          "@version": "1.1",
        },
        briefing: {
          id: "7ccab810-706b-401c-8757-71f656e56270",
          startTime: "2026-01-01T12:00:00+00:00",
          endTime: "2027-01-01T12:00:00+00:00",
          updateTime: "2026-01-10T12:00:00+00:00",
          title: "A short tab title",
          description: "A longer description of the briefing packet contents.",
          priority: false,
          officeId: "MPX",
          download:
            "http://localhost:8000/offices/MPX/briefing/download/7ccab810-706b-401c-8757-71f656e56270",
        },
      });
      const actual = await getDataForBriefing("ABC");

      expect(actual).to.deep.equal({
        briefing: {
          id: "7ccab810-706b-401c-8757-71f656e56270",
          officeId: "MPX",
          startTime: "2026-01-01T12:00:00+00:00",
          endTime: "2027-01-01T12:00:00+00:00",
          updateTime: "2026-01-10T12:00:00+00:00",
          title: "A short tab title",
          description: "A longer description of the briefing packet contents.",
          priority: false,
          download:
            "http://localhost:8000/offices/MPX/briefing/download/7ccab810-706b-401c-8757-71f656e56270",
        },
      });
    });
  });

  it("returns an error object if the briefing data is invalid", async () => {
    response.body.json.resolves({ briefing: null });
    const actual = await getDataForBriefing("ABC");

    expect(actual).to.eql({ briefing: null });
  });

  it("returns an error object if the briefing fetch is unsuccessful", async () => {
    response.statusCode = 500;
    const actual = await getDataForBriefing("ABC");

    expect(actual).to.eql({ error: true });
  });
});
