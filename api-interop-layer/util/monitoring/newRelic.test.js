import { expect } from "chai";
import sinon, { createSandbox } from "sinon";
import newrelic from "newrelic";

describe("New Relic wrapper", () => {
  const sandbox = createSandbox();

  const nr = sandbox.stub(newrelic);

  beforeEach(async () => {
    sandbox.resetHistory();
    sandbox.resetBehavior();
  });

  const loadNewRelic = async () =>
    // Import the module with cache-busting, so we can manipulate its load-time
    // behavior with environment variables.
    import(`./newRelic.js?${Date.now()}-${Math.random()}`);

  it("does nothing if the license is empty", async () => {
    const { sendNewRelicMetric } = await loadNewRelic();
    sendNewRelicMetric("garbage");

    expect(fetch.called).to.be.false;
  });

  it("passes along metrics if there is a license", async () => {
    nr.agent = {
      config: { app_name: ["bob's app"], license_key: "seventeen" },
    };
    global.fetch.resolves({
      json: sinon.stub().resolves({}),
    });

    const { sendNewRelicMetric } = await loadNewRelic();
    sendNewRelicMetric({ should: "go", timestamp: "hahaha" });

    expect(
      fetch.calledWithMatch(sinon.match.string, {
        method: "POST",
        headers: {
          "Api-Key": "seventeen",
        },
        body: JSON.stringify([
          {
            metrics: [
              {
                should: "go",
                timestamp: "hahaha",
                attributes: { applicationName: "bob's app" },
              },
            ],
          },
        ]),
      }),
    ).to.be.true;
  });
});
