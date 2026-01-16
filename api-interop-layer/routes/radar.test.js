import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("route: radar", () => {
  const sandbox = sinon.createSandbox();
  const getClosestPlace = sandbox.stub();
  const getRadarMetadata = sandbox.stub();

  let radar;

  before(async () => {
    await quibble.esm("../data/points.js", { getClosestPlace });
    await quibble.esm("../data/radar.js", { getRadarMetadata });

    radar = await import("./radar.js");
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
      expect(radar.method).to.equal("GET");
    });

    it("route url", () => {
      expect(radar.url).to.equal("/radar/:latitude/:longitude");
    });

    it("route schema", () => {
      expect(radar.schema).to.eql({
        params: {
          type: "object",
          properties: {
            latitude: {
              type: "number",
              minimum: -90,
              maximum: 90,
            },
            longitude: {
              type: "number",
              minimum: -180,
              maximum: 180,
            },
          },
        },
      });
    });

    it("route handler", () => {
      expect(radar.handler).to.be.instanceOf(Function);
    });
  });

  describe("the route handler", () => {
    it("returns an error, if there's an error", async () => {
      const request = { params: { latitude: "up", longitude: "left" } };
      getClosestPlace.resolves(null);

      const actual = await radar.handler(request);

      expect(getClosestPlace.calledWith("up", "left")).to.be.true;
      expect(actual).to.eql({
        data: {
          error: true,
        },
      });
    });

    it("returns radar metadata if everything is okay", async () => {
      const data = { fullName: "Koopa badlands" };
      const request = { params: { latitude: "down", longitude: "right" } };
      getClosestPlace.resolves(data);
      getRadarMetadata.resolves("Mr. Radar");

      const actual = await radar.handler(request);

      expect(getClosestPlace.calledWith("down", "right")).to.be.true;
      expect(actual).to.eql({
        data: {
          place: { fullName: "Koopa badlands" },
          radarMetadata: "Mr. Radar",
          point: {
            latitude: "down",
            longitude: "right",
          },
        },
      });
    });
  });
});
