import sinon from "sinon"; // eslint-disable-line import/no-extraneous-dependencies
import * as mariadb from "mariadb";

export async function mochaGlobalSetup() {
  sinon.stub(global, "fetch");
  sinon.stub(mariadb.default, "createConnection");
}

export async function mochaGlobalTeardown() {
  global.fetch.restore();
  mariadb.default.createConnection.restore();
}

export const mochaHooks = {
  beforeEach() {
    fetch.resetHistory();
    fetch.resetBehavior();
  },
};
