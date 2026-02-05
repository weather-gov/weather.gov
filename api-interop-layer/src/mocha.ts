import sinon from "sinon";
import pg from "pg";
const { Pool, Client } = pg;

const sandbox = sinon.createSandbox();

// Define the shape of our global test object
export interface GlobalTest {
	database: {
		query: sinon.SinonStub;
		end: sinon.SinonStub;
		release: sinon.SinonStub;
	};
}

export async function mochaGlobalSetup() {
	const globalAny = global as any;
	if (globalAny.test) {
		return;
	}
	// @ts-ignore: stubbing global fetch
	sandbox.stub(global, "fetch");

	// Stub out the PG (postgres) library's database
	// creation methods
	globalAny.test = {
		database: {
			query: sandbox.stub(),
			end: sandbox.stub(),
			release: sandbox.stub(),
		},
	};
	sinon.stub(Pool.prototype, "connect");
	sinon.stub(Client.prototype, "connect");
	// @ts-ignore: Sinon stub resolution type mismatch potential, safe to ignore for mock
	Pool.prototype.connect.resolves(globalAny.test.database);
	// @ts-ignore: Sinon stub resolution type mismatch potential
	Client.prototype.connect.resolves(globalAny.test.database);
}

export async function mochaGlobalTeardown() {
	// @ts-ignore: restoring global fetch
	global.fetch.restore();
	(Pool.prototype.connect as sinon.SinonStub).restore();
	(Client.prototype.connect as sinon.SinonStub).restore();
	const globalAny = global as any;
	delete globalAny.test;
}

export const mochaHooks = {
	beforeEach() {
		sandbox.resetHistory();
		sandbox.resetBehavior();
	},
};
