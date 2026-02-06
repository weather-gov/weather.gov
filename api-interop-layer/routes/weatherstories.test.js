import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("route: weatherstories", () => {
  const sandbox = sinon.createSandbox();
  const getDataForWxStory = sandbox.stub();

  let weatherStories;

  before(async () => {
    await quibble.esm("../data/weatherstory.js", { getDataForWxStory });

    weatherStories = await import("./weatherstories.js");
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
      expect(weatherStories.method).to.equal("GET");
    });

    it("route url", () => {
      expect(weatherStories.url).to.equal("/offices/:wfo/weatherstories");
    });

    it("route schema", () => {
      expect(weatherStories.schema).to.eql({
        params: {
          type: "object",
          properties: {
            wfo: {
              type: "string",
              pattern: "^[A-Z]{3}$",
            },
          },
        },
      });

      const idRegex = new RegExp(
        weatherStories.schema.params.properties.wfo.pattern,
      );

      expect(idRegex.test("ABC")).to.be.true;
      expect(idRegex.test("XYZ")).to.be.true;

      expect(idRegex.test("AB1")).to.be.false;
      expect(idRegex.test("abc")).to.be.false;
      expect(idRegex.test("xyz")).to.be.false;
      expect(idRegex.test("ABCD")).to.be.false;
      expect(idRegex.test("WXYZ")).to.be.false;
      expect(idRegex.test("12ABC")).to.be.false;
      expect(idRegex.test("AB.C")).to.be.false;
    });

    it("route handler", () => {
      expect(weatherStories.handler).to.be.instanceOf(Function);
    });
  });

  describe("the route handler", () => {
    it("returns an error, if there's an error", async () => {
      getDataForWxStory.resolves({ error: "Too dope", status: 3000 });
      const request = {
        params: { wfo: "Biggie Smalls" },
      };

      const actual = await weatherStories.handler(request);

      expect(getDataForWxStory.calledWith("Biggie Smalls")).to.be.true;
      expect(actual).to.eql({
        data: { error: "Too dope", status: 3000 },
        error: "Too dope",
        status: 3000,
      });
    });

    it("returns weatherstory data if everything is okay", async () => {
      const data = "this is some data here";
      getDataForWxStory.resolves(data);
      const request = {
        params: { wfo: "Tupac Shakur" },
      };

      const actual = await weatherStories.handler(request);

      expect(getDataForWxStory.calledWith("Tupac Shakur")).to.be.true;
      expect(actual).to.eql({ data });
    });
  });
});
