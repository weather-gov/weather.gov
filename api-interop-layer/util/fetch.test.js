import sinon from "sinon";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { fetchAPIJson } from "./fetch.js";

use(chaiAsPromised);

describe("fetch module", () => {
  const sandbox = sinon.createSandbox();
  const response = { status: 200, json: sandbox.stub() };
  const wait = sandbox.stub();

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
    wait.resolves();
  });

  it("succeeds on the first attempt", async () => {
    response.json.resolves("success");
    fetch.resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");
    expect(wait.callCount).to.equal(0);
    expect(fetch.callCount).to.equal(1);
    expect(fetch.calledWith("https://api.weather.gov/path/goes/here")).to.equal(
      true,
    );
  });

  it("fails once and then succeeds", async () => {
    response.json.resolves("success");
    fetch.onCall(0).rejects();
    fetch.onCall(1).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(1);
    expect(wait.calledWith(75)).to.equal(true);

    expect(fetch.callCount).to.equal(2);
    expect(fetch.calledWith("https://api.weather.gov/path/goes/here")).to.equal(
      true,
    );
  });

  it("fails twice and then succeeds", async () => {
    response.json.resolves("success");
    fetch.onCall(0).rejects();
    fetch.onCall(1).rejects();
    fetch.onCall(2).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(2);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);

    expect(fetch.callCount).to.equal(3);
    expect(fetch.calledWith("https://api.weather.gov/path/goes/here")).to.equal(
      true,
    );
  });

  it("fails three times and then succeeds", async () => {
    response.json.resolves("success");
    fetch.onCall(0).rejects();
    fetch.onCall(1).rejects();
    fetch.onCall(2).rejects();
    fetch.onCall(3).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(3);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);
    expect(wait.calledWith(204)).to.equal(true);

    expect(fetch.callCount).to.equal(4);
    expect(fetch.calledWith("https://api.weather.gov/path/goes/here")).to.equal(
      true,
    );
  });

  it("fails four times and then succeeds", async () => {
    response.json.resolves("success");
    fetch.onCall(0).rejects();
    fetch.onCall(1).rejects();
    fetch.onCall(2).rejects();
    fetch.onCall(3).rejects();
    fetch.onCall(4).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(4);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);
    expect(wait.calledWith(204)).to.equal(true);
    expect(wait.calledWith(337)).to.equal(true);

    expect(fetch.callCount).to.equal(5);
    expect(fetch.calledWith("https://api.weather.gov/path/goes/here")).to.equal(
      true,
    );
  });

  it("fails fives times and gives up", async () => {
    fetch.onCall(0).rejects();
    fetch.onCall(1).rejects();
    fetch.onCall(2).rejects();
    fetch.onCall(3).rejects();
    fetch.onCall(4).rejects();

    const result = fetchAPIJson("/path/goes/here", { wait });

    await expect(result).to.be.rejected;

    expect(wait.callCount).to.equal(4);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);
    expect(wait.calledWith(204)).to.equal(true);
    expect(wait.calledWith(337)).to.equal(true);

    expect(fetch.callCount).to.equal(5);
    expect(fetch.calledWith("https://api.weather.gov/path/goes/here")).to.equal(
      true,
    );
  });
});
