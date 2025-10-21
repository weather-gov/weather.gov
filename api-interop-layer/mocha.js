import sinon from "sinon";
import pg from "pg";
const { Pool, Client } = pg;

const sandbox = sinon.createSandbox();

export async function mochaGlobalSetup() {
  sandbox.stub(global, "fetch");

  // Stub out the PG (postgres) library's database
  // creation methods
  global.test = {
    database: {
      query: sandbox.stub(),
      end: sandbox.stub(),
      release: sandbox.stub(),
    },
  };
  sinon.stub(Pool.prototype, "connect");
  sinon.stub(Client.prototype, "connect");
  Pool.prototype.connect.resolves(global.test.database);
  Client.prototype.connect.resolves(global.test.database);
}

export async function mochaGlobalTeardown() {
  global.fetch.restore();
  Pool.prototype.connect.restore();
  Client.prototype.connect.restore();
}

export const mochaHooks = {
  beforeEach() {
    sandbox.resetHistory();
    sandbox.resetBehavior();
  },
};
