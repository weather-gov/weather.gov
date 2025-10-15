import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("route: point", () => {
  const sandbox = sinon.createSandbox();
  const getDataForPoint = sandbox.stub();
  const getRadarMetadata = sandbox.stub();

  let point;

  before(async () => {
    await quibble.esm("../data/index.js", { getDataForPoint });
    await quibble.esm("../data/radar.js", { getRadarMetadata });

    point = await import("./point.js");
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  after(async () => {
    await quibble.reset();
  });

  describe("exports required bits", () => {
    it("route method", () => {
      expect(point.method).to.equal("GET");
    });

    it("route url", () => {
      expect(point.url).to.equal("/point/:latitude/:longitude");
    });

    it("route schema", () => {
      expect(point.schema.params.latitude).to.exist;
      expect(point.schema.params.latitude.type).to.equal("number");
      expect(point.schema.params.latitude.minimum).to.equal(-90);
      expect(point.schema.params.latitude.maximum).to.equal(90);

      expect(point.schema.params.longitude).to.exist;
      expect(point.schema.params.longitude.type).to.equal("number");
      expect(point.schema.params.longitude.minimum).to.equal(-180);
      expect(point.schema.params.longitude.maximum).to.equal(180);
    });

    it("route handler", () => {
      expect(point.handler).to.be.instanceOf(Function);
    });
  });

  describe("the route handler", () => {
    it("returns an error, if there's an error", async () => {
      const request = { params: { latitude: "up", longitude: "left" } };
      getDataForPoint.resolves({
        error: "The princess is in another castle!",
        status: "Level 1.3",
      });

      const actual = await point.handler(request);

      expect(getDataForPoint.calledWith("up", "left")).to.be.true;
      expect(actual).to.eql({
        status: "Level 1.3",
        error: "The princess is in another castle!",
        data: {
          status: "Level 1.3",
          error: "The princess is in another castle!",
        },
      });
    });

    it("returns product data if everything is okay", async () => {
      const data = { text: "Mario should just hang out with Toad" };
      const request = { params: { latitude: "down", longitude: "right" } };
      getDataForPoint.resolves(data);
      getRadarMetadata.resolves("Mr. Radar");

      const actual = await point.handler(request);

      expect(getDataForPoint.calledWith("down", "right")).to.be.true;
      expect(actual).to.eql({
        data: {
          text: "Mario should just hang out with Toad",
          radarMetadata: "Mr. Radar",
        },
      });
    });
  });
});
