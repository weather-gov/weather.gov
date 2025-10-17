import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("route: GHWO", () => {
  const sandbox = sinon.createSandbox();
  const getGHWOData = sandbox.stub();

  let ghwo;

  before(async () => {
    await quibble.esm("../data/ghwo/index.js", { getGHWOData });

    ghwo = await import("./ghwo.js");
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
      expect(ghwo.method).to.equal("GET");
    });

    it("route url", () => {
      expect(ghwo.url).to.equal("/ghwo/:id");
    });

    it("route schema", () => {
      expect(ghwo.schema.params.id).to.exist;

      const idRegex = new RegExp(ghwo.schema.params.id.pattern);

      expect(idRegex.test("AB")).to.be.true;
      expect(idRegex.test("ab")).to.be.true;
      expect(idRegex.test("AB1")).to.be.false;
      expect(idRegex.test("A1")).to.be.false;
      expect(idRegex.test("ABC")).to.be.false;

      expect(idRegex.test("12345")).to.be.true;
      expect(idRegex.test("123")).to.be.false;
      expect(idRegex.test("123456")).to.be.false;
      expect(idRegex.test("12EAS")).to.be.false;
      expect(idRegex.test("12.45")).to.be.false;
    });

    it("route handler", () => {
      expect(ghwo.handler).to.be.instanceOf(Function);
    });
  });

  describe("the route handler", () => {
    it("returns an error, if there's an error", async () => {
      getGHWOData.resolves({ error: "Too dope", status: 3000 });
      const request = {
        params: { id: "Biggie Smalls" },
      };

      const actual = await ghwo.handler(request);

      expect(getGHWOData.calledWith("Biggie Smalls")).to.be.true;
      expect(actual).to.eql({
        status: 3000,
        data: { error: "Too dope" },
        error: "Too dope",
      });
    });

    it("returns GHWO data if everything is okay", async () => {
      const data = "this is some data here";
      getGHWOData.resolves({ data });
      const request = {
        params: { id: "Tupac Shakur" },
      };

      const actual = await ghwo.handler(request);

      expect(getGHWOData.calledWith("Tupac Shakur")).to.be.true;
      expect(actual).to.eql({ data });
    });
  });
});
