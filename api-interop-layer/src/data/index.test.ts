import sinon from "sinon";
import { expect } from "chai";
import quibble from "quibble";

describe("data index: getDataForPoint", () => {
	const sandbox = sinon.createSandbox();

	const getAlerts = sandbox.stub();
	const alignAlertsToDaily = sandbox.stub();
	const getForecast = sandbox.stub();
	const getObservations = sandbox.stub();
	const getPointData = sandbox.stub();
	const getSatellite = sandbox.stub();
	const getDbConnection = sandbox.stub();
	const logger = { child: sandbox.stub().returns({ info: sandbox.stub(), trace: sandbox.stub() }) };

	// Mock worker
	class MockWorker {
		on() { }
		postMessage() { }
	}

	let getDataForPoint;

	before(async () => {
		await quibble.esm("node:worker_threads", { Worker: MockWorker });
		await quibble.esm("./alerts/index.js", getAlerts);
		await quibble.esm("./alerts/utils.js", { alignAlertsToDaily });
		await quibble.esm("./forecast/index.js", getForecast);
		await quibble.esm("./obs/index.js", getObservations);
		await quibble.esm("./points.js", { getPointData });
		await quibble.esm("./satellite.js", getSatellite);
		await quibble.esm("../util/monitoring/index.js", { logger });
		await quibble.esm("./db.js", getDbConnection);

		// Mock ForecastGridCache class
		class MockCache {
			constructor() { }
			logGridHit() { }
		}
		await quibble.esm("./forecast/cache.js", { ForecastGridCache: MockCache });

		const module = await import("./index.js");
		getDataForPoint = module.getDataForPoint;
	});

	after(async () => {
		await quibble.reset();
	});

	beforeEach(() => {
		sandbox.resetHistory();
		// Setup default successful responses
		getPointData.resolves({
			point: { lat: 1, lon: 2 },
			place: { name: "Place" },
			grid: { wfo: "OK", x: 1, y: 1 },
			isMarine: false
		});
		getSatellite.resolves({ some: "satellite" });
		const dbClient = { release: sandbox.stub() };
		getDbConnection.resolves({ connect: sandbox.stub().resolves(dbClient) });
		getForecast.resolves({ gridData: {}, daily: { error: false, days: [] } });
		getObservations.resolves({ some: "obs" });
		getAlerts.resolves({ items: [] });
	});

	it("returns 404 if grid is out of bounds", async () => {
		getPointData.resolves({ grid: { outOfBounds: true, error: true }, point: { lat: 1, lon: 2 } });
		getAlerts.resolves({ items: [] }); // Alerts are still fetched

		// Note: implementation gets alerts even if grid is error (fallback to point)
		// But if outOfBounds is true, it returns 404 eventually.

		const result = await getDataForPoint(1, 2);
		expect(result.status).to.equal(404);
		expect(result.reason).to.equal("out-of-bounds");
	});

	it("returns 200 with error if not supported", async () => {
		getPointData.resolves({ grid: { notSupported: true, error: true }, point: { lat: 1, lon: 2 } });
		getAlerts.resolves({ items: [] });

		const result = await getDataForPoint(1, 2);
		expect(result.status).to.equal(200);
		expect(result.reason).to.equal("not-supported");
		expect(result.error).to.be.true;
	});

	it("assembles data correctly on success", async () => {
		// Setup successful responses
		const grid = { wfo: "OK", x: 1, y: 1 };
		getPointData.resolves({ point: { lat: 1 }, place: { name: "P" }, grid, isMarine: false });

		const forecastData = { daily: { error: false, days: [{ hours: [{ time: { format: sandbox.stub().returns("formatted") } }] }] }, gridData: { elev: 100 } };
		getForecast.resolves(forecastData);

		getObservations.resolves({ obs: "data" });
		getSatellite.resolves({ sat: "data" });
		getAlerts.resolves({ items: [{ hash: "h1" }] });

		const result = await getDataForPoint(1, 2);

		expect(result.forecast).to.equal(forecastData.daily);
		expect(result.observed).to.eql({ obs: "data" });
		expect(result.satellite).to.eql({ sat: "data" });
		expect(result.alerts.items).to.eql(["h1"]); // Should map to hashes
		expect(result.grid.elev).to.equal(100); // Grid data merged
	});
});
