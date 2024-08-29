import sinon from "sinon";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { fetchAPIJson } from "./fetch.js";

use(chaiAsPromised);

describe("fetch module", () => {
  const sandbox = sinon.createSandbox();

  const fetchMock = sandbox.stub(global, "fetch");
  const response = { json: sandbox.stub() };
  const wait = sandbox.stub();

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();
    wait.resolves();
  });

  it("succeeds on the first attempt", async () => {
    response.json.resolves("success");
    fetchMock.resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");
    expect(wait.callCount).to.equal(0);
    expect(fetchMock.callCount).to.equal(1);
    expect(
      fetchMock.calledWith("https://api.weather.gov/path/goes/here"),
    ).to.equal(true);
  });

  it("fails once and then succeeds", async () => {
    response.json.resolves("success");
    fetchMock.onCall(0).rejects();
    fetchMock.onCall(1).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(1);
    expect(wait.calledWith(75)).to.equal(true);

    expect(fetchMock.callCount).to.equal(2);
    expect(
      fetchMock.calledWith("https://api.weather.gov/path/goes/here"),
    ).to.equal(true);
  });

  it("fails twice and then succeeds", async () => {
    response.json.resolves("success");
    fetchMock.onCall(0).rejects();
    fetchMock.onCall(1).rejects();
    fetchMock.onCall(2).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(2);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);

    expect(fetchMock.callCount).to.equal(3);
    expect(
      fetchMock.calledWith("https://api.weather.gov/path/goes/here"),
    ).to.equal(true);
  });

  it("fails three times and then succeeds", async () => {
    response.json.resolves("success");
    fetchMock.onCall(0).rejects();
    fetchMock.onCall(1).rejects();
    fetchMock.onCall(2).rejects();
    fetchMock.onCall(3).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(3);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);
    expect(wait.calledWith(204)).to.equal(true);

    expect(fetchMock.callCount).to.equal(4);
    expect(
      fetchMock.calledWith("https://api.weather.gov/path/goes/here"),
    ).to.equal(true);
  });

  it("fails four times and then succeeds", async () => {
    response.json.resolves("success");
    fetchMock.onCall(0).rejects();
    fetchMock.onCall(1).rejects();
    fetchMock.onCall(2).rejects();
    fetchMock.onCall(3).rejects();
    fetchMock.onCall(4).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(4);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);
    expect(wait.calledWith(204)).to.equal(true);
    expect(wait.calledWith(337)).to.equal(true);

    expect(fetchMock.callCount).to.equal(5);
    expect(
      fetchMock.calledWith("https://api.weather.gov/path/goes/here"),
    ).to.equal(true);
  });

  it("fails fives times and gives up", async () => {
    fetchMock.onCall(0).rejects();
    fetchMock.onCall(1).rejects();
    fetchMock.onCall(2).rejects();
    fetchMock.onCall(3).rejects();
    fetchMock.onCall(4).rejects();

    const result = fetchAPIJson("/path/goes/here", { wait });

    await expect(result).to.be.rejected;

    expect(wait.callCount).to.equal(4);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);
    expect(wait.calledWith(204)).to.equal(true);
    expect(wait.calledWith(337)).to.equal(true);

    expect(fetchMock.callCount).to.equal(5);
    expect(
      fetchMock.calledWith("https://api.weather.gov/path/goes/here"),
    ).to.equal(true);
  });
});
