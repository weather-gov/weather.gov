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
  sandbox.stub(Pool.prototype, "connect");
  sandbox.stub(Client.prototype, "connect");
  Pool.prototype.connect.resolves(global.test.database);
  Client.prototype.connect.resolves(global.test.database);
}

export async function mochaGlobalTeardown() {
  sandbox.restore();
}

export const mochaHooks = {
  beforeEach() {
    sandbox.resetHistory();
    sandbox.resetBehavior();
  },
};
