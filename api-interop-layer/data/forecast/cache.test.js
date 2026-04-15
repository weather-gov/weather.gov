import sinon from "sinon";
import { expect } from "chai";
import { ForecastGridCache } from "./cache.js";

describe("ForecastGridCache Tests", () => {
  let gridCache, clock, parent, sandbox;

  before(() => {
    sandbox = sinon.createSandbox();
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    ForecastGridCache.buffer = [];
    clock.reset();

    // Mock the worker interface
    parent = {
      postMessage: sandbox.stub(),
    };

    gridCache = new ForecastGridCache(parent);
  });

  after(() => {
    clock.restore();
    sandbox.restore();
  });

  it("should push hits into the static buffer", () => {
    gridCache.logGridHit({ wfo: "TOP", x: 10, y: 20 });
    expect(ForecastGridCache.buffer.length).to.equal(1);
    expect(ForecastGridCache.buffer[0].wfo).to.equal("TOP");
  });

  it("should post a message to the worker and clear the buffer after 5 seconds", async () => {
    gridCache.logGridHit({ wfo: "LWX", x: 1, y: 1 });
    gridCache.logGridHit({ wfo: "BOX", x: 2, y: 2 });

    // Move forward 5 seconds
    await clock.tickAsync(5000);

    expect(parent.postMessage.calledOnce).to.be.true;

    const message = parent.postMessage.getCall(0).args[0];
    expect(message.action).to.equal("flush_forecast_grid_logs");
    expect(message.payload.length).to.equal(2);
    expect(message.payload[0].wfo).to.equal("LWX");

    // Verify buffer is cleared immediately on flush
    expect(ForecastGridCache.buffer.length).to.equal(0);
  });

  it("should not send a message if the buffer is empty", async () => {
    await clock.tickAsync(5000);
    expect(parent.postMessage.called).to.be.false;
  });
});
