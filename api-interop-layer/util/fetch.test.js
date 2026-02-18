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
    response.status = 200;
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

    const result = await fetchAPIJson("/path/goes/here", { wait });

    await expect(result).to.eql({ error: true });

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

  it("does retry on server errors (status code 5xx)", async () => {
    response.status = 500;
    response.json.resolves({ message: "here" });

    const response2 = {
      status: 200,
      json: sinon.stub().resolves({ message: "there" }),
    };

    fetch.onCall(0).resolves(response);
    fetch.onCall(1).resolves(response2);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.eql({ message: "there" });
    expect(wait.callCount).to.equal(1);
    expect(fetch.callCount).to.equal(2);
    expect(fetch.calledWith("https://api.weather.gov/path/goes/here")).to.equal(
      true,
    );
  });

  it("does not retry on request errors (status code 4xx)", async () => {
    response.status = 400;
    response.json.resolves({ message: "here" });
    fetch.resolves(response);

    const result = await fetchAPIJson("/path/goes/here");

    expect(result).to.eql({ error: true, status: 400, message: "here" });
    expect(wait.callCount).to.equal(0);
    expect(fetch.callCount).to.equal(1);
    expect(fetch.calledWith("https://api.weather.gov/path/goes/here")).to.equal(
      true,
    );
  });

  // Every path must start with exactly one "/" to be accepted. Anything
  // else — absolute URLs, protocol-relative references, data URIs, bare
  // hostnames — gets blocked before fetch is ever invoked.
  it("rejects absolute URLs to prevent SSRF attacks", async () => {
    response.json.resolves("success");
    fetch.resolves(response);

    const result = await fetchAPIJson("https://evil.com/steal-data", { wait });
    expect(result).to.have.property("error", true);
    expect(fetch.callCount).to.equal(0);
  });

  // Protocol-relative URLs like "//evil.com" would resolve against the
  // base URL's scheme and send the request to evil.com instead of the
  // configured API host. The double-slash must be caught explicitly.
  it("rejects protocol-relative URLs (//evil.com)", async () => {
    response.json.resolves("success");
    fetch.resolves(response);

    const result = await fetchAPIJson("//evil.com/data", { wait });
    expect(result).to.have.property("error", true);
    expect(fetch.callCount).to.equal(0);
  });

  // data: URIs don't contain "://" but Node's fetch still resolves them,
  // so they need to be blocked as well. The leading-slash requirement
  // handles this naturally.
  it("rejects data: URIs", async () => {
    response.json.resolves("success");
    fetch.resolves(response);

    const result = await fetchAPIJson("data:text/html,<h1>xss</h1>", { wait });
    expect(result).to.have.property("error", true);
    expect(fetch.callCount).to.equal(0);
  });

  // A bare hostname without a scheme could still be misinterpreted
  // depending on the URL parser. Paths without a leading "/" are rejected.
  it("rejects paths that don't start with a slash", async () => {
    response.json.resolves("success");
    fetch.resolves(response);

    const result = await fetchAPIJson("evil.com/path", { wait });
    expect(result).to.have.property("error", true);
    expect(fetch.callCount).to.equal(0);
  });

  it("specially handles syntax errors (ie, non-JSON data", async () => {
    const error = new SyntaxError();
    error.cause = { message: "not JSON probably" };
    response.json.rejects(error);
    fetch.resolves(response);

    const expected = { message: "not JSON probably", error: true };

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.eql(expected);
  });
});
