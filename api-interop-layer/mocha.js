import sinon from "sinon";
import pg from "pg";
import undici from "undici";

const { Pool, Client } = pg;

const sandbox = sinon.createSandbox();

export function mochaGlobalSetup() {
  sandbox.stub(global, "fetch");
  sandbox.stub(undici, "request");

  // Stub out the PG (postgres) library's database
  // creation methods
  global.test = {
    database: {
      query: sandbox.stub(),
      end: sandbox.stub(),
      release: sandbox.stub(),
    },
  };

  sandbox.stub(Pool.prototype, "connect");
  sandbox.stub(Client.prototype, "connect");
  Pool.prototype.connect.resolves(global.test.database);
  Client.prototype.connect.resolves(global.test.database);
}

export function mochaGlobalTeardown() {
  sandbox.restore();
}

export const mochaHooks = {
   beforeEach() {
    sandbox.resetHistory();

    undici.request.rejects(new Error("undici.request is not mocked"));
    global.fetch.rejects(new Error("fetch is not mocked"));
  },
  afterEach() {
    process.emit("SHUTDOWN");
  }
};
