import sinon from "sinon";
import { expect } from "chai";
import * as mariadb from "mariadb";

describe("alert data module", () => {
  const sandbox = sinon.createSandbox();
  const db = {
    query: sandbox.stub(),
    end: () => Promise.resolve(),
  };

  let fetchMock;
  let createConnection;

  before(() => {
    fetchMock = sandbox.stub(global, "fetch");
    createConnection = sandbox.stub(mariadb.default, "createConnection");
  });

  const response = { json: sandbox.stub() };

  beforeEach(() => {
    sandbox.resetBehavior();
    sandbox.resetHistory();

    createConnection.resolves(db);
    fetchMock.resolves(response);
  });

  after(() => {
    global.fetch.restore();
    mariadb.default.createConnection.restore();
  });

  it("fetches alerts when the module is loaded", async () => {
    response.json.resolves({ features: ["bob"] });
    return import("./index.js");
  });
});
