import sinon from "sinon";
import { expect } from "chai";
import * as mariadb from "mariadb";

describe("alert data module", () => {
  const sandbox = sinon.createSandbox();
  const db = {
    query: sandbox.stub(),
    end: () => Promise.resolve(),
  };

  const response = { json: sandbox.stub() };

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();

    mariadb.default.createConnection.resolves(db);
    fetch.resolves(response);
  });

  it("fetches alerts when the module is loaded", async () => {
    response.json.resolves({ features: [] });
    await import("./index.js");

    expect(
      fetch.calledWith("https://api.weather.gov/alerts/active?status=actual"),
    ).to.be.true;
  });
});
