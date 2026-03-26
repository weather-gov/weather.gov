import { expect } from "chai";
import sinon from "sinon";
import { requestJSON } from "./request.js";

describe("request helper", () => {
  let dispatcher,
    sandbox;

  before(() => {
    sandbox = sinon.createSandbox();
  });

  beforeEach(() => {
    dispatcher = {
      request: sandbox.stub(),
    };
  });

  afterEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
  });

  after(() => {
    sandbox.restore();
  });

  // Helper to create a body object that looks like an Undici body
  const createMockBody = (textValue = "{}") => {
    return {
      text: sandbox.stub().resolves(textValue),
      dump: sandbox.stub().resolves(),
      bodyUsed: false,
    };
  };

  it("returns data in the happy path", async () => {
    const mockBody = createMockBody(JSON.stringify({ foo: "bar" }));
    dispatcher.request.resolves({
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: mockBody,
    });

    const actual = await requestJSON(dispatcher, "/happy");

    expect(actual).to.deep.equal({ foo: "bar" });
    expect(dispatcher.request.calledOnce).to.be.true;
  });

  it("throws errors for 4xx/5xx responses", async () => {
    const mockBody = createMockBody();
    dispatcher.request.resolves({
      statusText: "Not Found",
      statusCode: 404,
      headers: { "content-type": "application/json" },
      body: mockBody,
    });

    let caughtError;
    try {
      await requestJSON(dispatcher, "/not-found");
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).to.exist;
    expect(caughtError.message).to.contain("Request failed: 404");
    // Ensure dump was called to release the socket
    expect(mockBody.dump.called).to.be.true;
  });

  it("throws an error if content-type is not JSON", async () => {
    const mockBody = createMockBody();
    dispatcher.request.resolves({
      statusCode: 200,
      headers: { "content-type": "text/html" },
      body: mockBody,
    });

    let caughtError;
    try {
      await requestJSON(dispatcher, "/html");
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).to.exist;
    expect(caughtError.message).to.contain("Response was not JSON");
    // Ensure dump was called because logic stopped before text()
    expect(mockBody.dump.called).to.be.true;
  });

  it("handles empty bodies gracefully", async () => {
    const mockBody = createMockBody("");
    dispatcher.request.resolves({
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: mockBody,
    });

    const actual = await requestJSON(dispatcher, "/empty");
    expect(actual).to.be.null;
  });
});
