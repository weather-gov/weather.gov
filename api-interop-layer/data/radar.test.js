import { expect } from "chai";
import sinon from "sinon";
import { Pool } from "undici";
import { getRadarMetadata, radarTimestamps } from "./radar.js";


describe("data: radar", () => {
  const sandbox = sinon.createSandbox();

  sandbox.stub(Pool.prototype, "request");

  beforeEach(() => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
    radarTimestamps.start = null;
    radarTimestamps.end = null;
    radarTimestamps.last = 0;
  });

  after(() => {
    sandbox.restore();
  });
  
  describe("returns nulls with invalid place data", () => {
    it("empty place", async () => {
      const actual = await getRadarMetadata({
        point: { latitude: 0, longitude: 0 },
      });
      expect(actual).to.eql({ start: null, end: null });
    });

    it("no timezone", async () => {
      const actual = await getRadarMetadata({
        place: {},
        point: { latitude: 0, longitude: 0 },
      });
      expect(actual).to.eql({ start: null, end: null });
    });

    it("place has error", async () => {
      const actual = await getRadarMetadata({
        place: { error: true },
        point: { latitude: 0, longitude: 0 },
      });
      expect(actual).to.eql({ start: null, end: null });
    });
  });

  it("it returns metadata", async () => {
    Pool.prototype.request.resolves({
      statusCode: 200,
      body: {
        text: sandbox
        .stub()
        .resolves(
          `a;lghashgasdfjalsdf<Extent name="time" asahsh>asdf,asdf,asdf,asdf,2014-09-03T14:00:00Z,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,2014-09-03T14:30:00Z</Extent>`,
        ),
        dump: sandbox.stub().resolves()
      },
      headers: {
        "content-type": "application/xml"
      }
      ,
    });

    const actual = await getRadarMetadata({
      place: { timezone: "America/Chicago" },
      point: { latitude: 37.236, longitude: -92.6246 },
    });

    expect(actual).to.eql({
      start: "2014-09-03T09:00:00-05:00",
      end: "2014-09-03T09:30:00-05:00",

      // base64-encoded JSON string specifying the center of the map and a zoom
      // level. It better not change given the inputs!
      settings:
        "eyJhZ2VuZGEiOnsiaWQiOiJ3ZWF0aGVyIiwiY2VudGVyIjpbLTkyLjYyNDYsMzcuMjM2XSwiem9vbSI6OCwibGF5ZXIiOiJicmVmX3FjZCJ9fQ==",
    });
  });

  it("sets the wx-host header", async () => {
    Pool.prototype.request.resolves({
      statusCode: 200,
      headers: {
        "content-type": "application/xml"
      },
      body: {
        text: sandbox.stub().resolves("hello"),
        dump: sandbox.stub().resolves()
      }
    });

    debugger;
    await getRadarMetadata({
      place: { timezone: "America/Chicago" },
      point: { latitude: 37.236, longitude: -92.6246 },
    });

    expect(Pool.prototype.request.calledWith(
      sinon.match({headers: { "wx-host": sinon.match.any }})
    )).to.equal(true);
  });
});
