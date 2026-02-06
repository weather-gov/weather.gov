import sinon from "sinon";
import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { fetchAPIJson, BASE_URL } from "./fetch.js";
import undici from "undici";

use(chaiAsPromised);

describe("fetch module", () => {
  const sandbox = sinon.createSandbox();
  const response = {
    statusCode: 200,
    body: { json: sandbox.stub() },
  };
  const wait = sandbox.stub();

  beforeEach(() => {
    response.statusCode = 200;
    sandbox.resetBehavior();
    sandbox.resetHistory();
    wait.resolves();
  });

  it("succeeds on the first attempt", async () => {
    response.body.json.resolves("success");
    undici.request.resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");
    expect(wait.callCount).to.equal(0);
    expect(undici.request.callCount).to.equal(1);
    expect(undici.request.calledWith(`${BASE_URL}/path/goes/here`)).to.equal(
      true,
    );
  });

  it("fails once and then succeeds", async () => {
    response.body.json.resolves("success");
    undici.request.onCall(0).rejects();
    undici.request.onCall(1).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(1);
    expect(wait.calledWith(75)).to.equal(true);

    expect(undici.request.callCount).to.equal(2);
    expect(undici.request.calledWith(`${BASE_URL}/path/goes/here`)).to.equal(
      true,
    );
  });

  it("fails twice and then succeeds", async () => {
    response.body.json.resolves("success");
    undici.request.onCall(0).rejects();
    undici.request.onCall(1).rejects();
    undici.request.onCall(2).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(2);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);

    expect(undici.request.callCount).to.equal(3);
    expect(undici.request.calledWith(`${BASE_URL}/path/goes/here`)).to.equal(
      true,
    );
  });

  it("fails three times and then succeeds", async () => {
    response.body.json.resolves("success");
    undici.request.onCall(0).rejects();
    undici.request.onCall(1).rejects();
    undici.request.onCall(2).rejects();
    undici.request.onCall(3).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(3);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);
    expect(wait.calledWith(204)).to.equal(true);

    expect(undici.request.callCount).to.equal(4);
    expect(undici.request.calledWith(`${BASE_URL}/path/goes/here`)).to.equal(
      true,
    );
  });

  it("fails four times and then succeeds", async () => {
    response.body.json.resolves("success");
    undici.request.onCall(0).rejects();
    undici.request.onCall(1).rejects();
    undici.request.onCall(2).rejects();
    undici.request.onCall(3).rejects();
    undici.request.onCall(4).resolves(response);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.equal("success");

    expect(wait.callCount).to.equal(4);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);
    expect(wait.calledWith(204)).to.equal(true);
    expect(wait.calledWith(337)).to.equal(true);

    expect(undici.request.callCount).to.equal(5);
    expect(undici.request.calledWith(`${BASE_URL}/path/goes/here`)).to.equal(
      true,
    );
  });

  it("fails fives times and gives up", async () => {
    undici.request.onCall(0).rejects();
    undici.request.onCall(1).rejects();
    undici.request.onCall(2).rejects();
    undici.request.onCall(3).rejects();
    undici.request.onCall(4).rejects();

    const result = await fetchAPIJson("/path/goes/here", { wait });

    await expect(result).to.eql({ error: true });

    expect(wait.callCount).to.equal(4);
    expect(wait.calledWith(75)).to.equal(true);
    expect(wait.calledWith(124)).to.equal(true);
    expect(wait.calledWith(204)).to.equal(true);
    expect(wait.calledWith(337)).to.equal(true);

    expect(undici.request.callCount).to.equal(5);
    expect(undici.request.calledWith(`${BASE_URL}/path/goes/here`)).to.equal(
      true,
    );
  });

  it("does retry on server errors (status code 5xx)", async () => {
    response.statusCode = 500;
    response.body.json.resolves({ message: "here" });

    const response2 = {
      statusCode: 200,
      body: { json: sinon.stub().resolves({ message: "there" }) },
    };

    undici.request.onCall(0).resolves(response);
    undici.request.onCall(1).resolves(response2);

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.eql({ message: "there" });
    expect(wait.callCount).to.equal(1);
    expect(undici.request.callCount).to.equal(2);
    expect(undici.request.calledWith(`${BASE_URL}/path/goes/here`)).to.equal(
      true,
    );
  });

  it("does not retry on request errors (status code 4xx)", async () => {
    response.statusCode = 400;
    response.body.json.resolves({ message: "here" });
    undici.request.resolves(response);

    const result = await fetchAPIJson("/path/goes/here");

    expect(result).to.eql({ error: true, status: 400, message: "here" });
    expect(wait.callCount).to.equal(0);
    expect(undici.request.callCount).to.equal(1);
    expect(undici.request.calledWith(`${BASE_URL}/path/goes/here`)).to.equal(
      true,
    );
  });

  it("specially handles syntax errors (ie, non-JSON data", async () => {
    const error = new SyntaxError();
    error.cause = { message: "not JSON probably" };
    response.body.json.rejects(error);
    undici.request.resolves(response);

    const expected = { message: "not JSON probably", error: true };

    const result = await fetchAPIJson("/path/goes/here", { wait });

    expect(result).to.eql(expected);
  });
});
