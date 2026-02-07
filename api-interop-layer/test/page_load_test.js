
import { spawn } from 'child_process';

const PORT = 8082;
const BASE_URL = `http://localhost:${PORT}`;

// Simulation of a "Point Forecast" page load
// Based on forecast/backend/interop.py usage
const SCENARIO = {
	name: "Point Forecast Page",
	requests: [
		{ url: '/point/39.7456,-97.0892', weight: 1 }, // Main data (grid, forecast, alerts)
		{ url: '/radar/39.7456,-97.0892', weight: 1 }, // Radar layer
		{ url: '/county/KS143', weight: 1 },           // County data (assuming KS143 for this point)
		// Risk overview is often per county or place
		{ url: '/risk-overview/KS143', weight: 1 }
	]
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function startServer() {
	console.log("Waiting for server on port " + PORT + "...");
	// Wait for health check
	for (let i = 0; i < 30; i++) {
		try {
			const res = await fetch(`${BASE_URL}/health`);
			if (res.ok) {
				console.log("Server ready.");
				return null;
			}
		} catch { }
		await sleep(1000);
	}
	throw new Error("Server not running. Please start it externally.");
}

async function runTest() {
	console.log(`\n=== Simulating ${SCENARIO.name} ===\n`);

	// Warmup
	await fetch(`${BASE_URL}/health`);

	const samples = [];
	for (let i = 0; i < 20; i++) {
		const start = performance.now();

		// Parallel fetch simulation (browsers/backends might do parallel)
		// But interop.py seemed blocking. Let's assume the Frontend (Django) 
		// makes these calls. If Django is sync, it's sequential. 
		// We will test PARALLEL to simulate ideal "Page Load" if frontend is optimized,
		// or effectively the server's ability to handle the concurrency.
		const promises = SCENARIO.requests.map(req =>
			fetch(`${BASE_URL}${req.url}`).then(r => r.text())
		);

		await Promise.all(promises);

		const duration = performance.now() - start;
		samples.push(duration);
		process.stdout.write('.');
	}
	console.log("\n");

	samples.sort((a, b) => a - b);
	const p50 = samples[Math.floor(samples.length * 0.5)];
	const p95 = samples[Math.floor(samples.length * 0.95)];
	const mean = samples.reduce((a, b) => a + b, 0) / samples.length;

	console.log(`Results for ${SCENARIO.requests.length} concurrent requests:`);
	console.log(`Mean: ${mean.toFixed(2)}ms`);
	console.log(`P50:  ${p50.toFixed(2)}ms`);
	console.log(`P95:  ${p95.toFixed(2)}ms`);

	return { mean, p50, p95 };
}

async function main() {
	let server;
	try {
		server = await startServer();
		const results = await runTest();

		// Output for parsing if needed
		console.log(`__RESULTS_JSON__:${JSON.stringify(results)}`);

	} catch (e) {
		console.error(e);
		process.exit(1);
	} finally {
		if (server) server.kill();
	}
}

main();
