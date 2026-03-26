import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("route: meta/alerts", () => {
  let rest,
    alerts,
    sandbox;

  before(async () => {
    sandbox = sinon.createSandbox();
    rest = sandbox.stub();

    await quibble.esm("../../data/alerts/kinds.js", { rest });

    alerts = await import("./alerts.js");
  });

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  after(async () => {
    sandbox.restore();
    await quibble.reset();
  });

  describe("exports required bits", () => {
    it("route method", () => {
      expect(alerts.method).to.equal("GET");
    });

    it("route url", () => {
      expect(alerts.url).to.equal("/meta/alerts");
    });

    it("does not have a route schema", () => {
      expect(alerts.schema).to.eql({});
    });

    it("route handler", () => {
      expect(alerts.handler).to.be.instanceOf(Function);
    });
  });

  it("the route handler passes data straight through", async () => {
    const data =
      "A meta alert is an alert about an alert. For example, your tornado warning is purple.";
    rest.resolves(data);

    const actual = await alerts.handler();

    expect(actual).to.eql({ data });
  });
});
