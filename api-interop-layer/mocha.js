import sinon from "sinon"; // eslint-disable-line import/no-extraneous-dependencies
import * as database from "mysql2/promise.js";

const sandbox = sinon.createSandbox();

export async function mochaGlobalSetup() {
  sandbox.stub(global, "fetch");
  sinon.stub(database.default, "createConnection");
  sinon.stub(database.default, "createPool");
  global.test = { database: { query: sandbox.stub(), end: sandbox.stub() } };

  database.default.createConnection.resolves(global.test.database);
  database.default.createPool.resolves(global.test.database);
}

export async function mochaGlobalTeardown() {
  global.fetch.restore();
  database.default.createConnection.restore();
  database.default.createPool.restore();
}

export const mochaHooks = {
  beforeEach() {
    sandbox.resetHistory();
    sandbox.resetBehavior();
  },
};
