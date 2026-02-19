import { expect } from "chai";
import sinon from "sinon";
import { requestJSON } from "./request.js";

describe("request helper", () => {
  const sandbox = sinon.createSandbox();

  const dispatcher = {
    request: sandbox.stub(),
  };

  const body = {
    dump: sinon.stub(),
    json: sinon.stub(),
  };

  beforeEach(() => {
    sandbox.reset();
  });

  it("returns data in the happy path", async () => {
    dispatcher.request.resolves({ statusText: null, statusCode: 200, body });
    body.json.resolves("bob's overpants");

    const actual = await requestJSON(dispatcher, "bob's underpants");

    expect(
      dispatcher.request.calledWith({
        path: "bob's underpants",
        method: "GET",
        headers: sinon.match.object,
      }),
    ).to.be.true;

    expect(actual).to.equal("bob's overpants");
  });

  it("passes errors along", async () => {
    dispatcher.request.resolves({
      statusText: "big badaboom",
      statusCode: 404,
      body,
    });

    const actual = await requestJSON(dispatcher, "meat popsicle");

    expect(
      dispatcher.request.calledWith({
        path: "meat popsicle",
        method: "GET",
        headers: sinon.match.object,
      }),
    ).to.be.true;

    expect(actual.cause).to.eql({
      statusText: "big badaboom",
      statusCode: 404,
    });
    expect(actual.error).to.eql(true);
  });
});
