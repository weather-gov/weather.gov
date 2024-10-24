import sinon from "sinon"; // eslint-disable-line import/no-extraneous-dependencies
import * as mariadb from "mariadb";

const sandbox = sinon.createSandbox();

export async function mochaGlobalSetup() {
  sandbox.stub(global, "fetch");
  sinon.stub(mariadb.default, "createConnection");
  sinon.stub(mariadb.default, "createPool");
  global.test = { database: { query: sandbox.stub(), end: sandbox.stub() } };

  mariadb.default.createConnection.resolves(global.test.database);
  mariadb.default.createPool.resolves(global.test.database);
}

export async function mochaGlobalTeardown() {
  global.fetch.restore();
  mariadb.default.createConnection.restore();
  mariadb.default.createPool.restore();
}

export const mochaHooks = {
  beforeEach() {
    sandbox.resetHistory();
    sandbox.resetBehavior();
  },
};
