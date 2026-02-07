
import { spawn } from 'child_process';
import http from 'http';

// Config
const NODE_PORT = 8081;
const GO_PORT = 8082;
const ENDPOINTS = [
	`/point/39.7456,-97.0892`,
	`/radar/39.7456,-97.0892`,
];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function startServer(cmd, args, port, name) {
	console.log(`Starting ${name} on port ${port}...`);
	const env = { ...process.env, PORT: port.toString() };
	const child = spawn(cmd, args, { env, stdio: 'pipe' });

	child.stdout.on('data', (data) => {
		// console.log(`[${name}] ${data}`);
	});
	child.stderr.on('data', (data) => {
		console.error(`[${name}] ${data}`);
	});

	// Wait for health check
	for (let i = 0; i < 30; i++) {
		try {
			const res = await fetch(`http://localhost:${port}/health`);
			if (res.ok) {
				console.log(`${name} is ready.`);
				return child;
			}
		} catch (e) {
			// console.log(`Waiting for ${name}...`);
		}
		await sleep(1000);
	}
	throw new Error(`${name} failed to start`);
}

async function measure(port, endpoint) {
	const start = performance.now();
	const res = await fetch(`http://localhost:${port}${endpoint}`);
	const end = performance.now();
	if (!res.ok) throw new Error(`Status ${res.status}`);
	await res.text(); // consume body
	return end - start;
}

async function benchmark(name, port) {
	console.log(`Benchmarking ${name}...`);
	const stats = {};
	for (const ep of ENDPOINTS) {
		const samples = [];
		// Warmup
		for (let i = 0; i < 5; i++) await measure(port, ep).catch(() => { });

		// Measure
		for (let i = 0; i < 50; i++) {
			try {
				const dur = await measure(port, ep);
				samples.push(dur);
			} catch (e) {
				console.error(`${name} ${ep} error:`, e.message);
			}
		}

		if (samples.length === 0) {
			stats[ep] = "Failed";
			continue;
		}

		samples.sort((a, b) => a - b);
		const p50 = samples[Math.floor(samples.length * 0.5)];
		const p95 = samples[Math.floor(samples.length * 0.95)];
		const mean = samples.reduce((a, b) => a + b, 0) / samples.length;

		stats[ep] = {
			p50: p50.toFixed(2),
			p95: p95.toFixed(2),
			mean: mean.toFixed(2)
		};
	}
	return stats;
}

async function main() {
	let nodeServer, goServer;

	try {
		// Start Node
		nodeServer = await startServer('npx', ['-y', 'tsx', 'src/main.ts'], NODE_PORT, 'Node');

		// Start Go
		goServer = await startServer('go', ['run', 'cmd/server/main.go'], GO_PORT, 'Go');

		console.log("\nStarting Benchmarks...\n");
		const nodeStats = await benchmark('Node', NODE_PORT);
		const goStats = await benchmark('Go', GO_PORT);

		console.log("\nResults (ms):\n");
		console.table({ Node: nodeStats, Go: goStats });

		// Calculate improvement
		console.log("\nComparison (Go vs Node improvement):");
		for (const ep of ENDPOINTS) {
			const n = nodeStats[ep];
			const g = goStats[ep];
			if (n && g && n.mean && g.mean) {
				const improvement = n.mean / g.mean;
				console.log(`${ep}: ${improvement.toFixed(2)}x faster`);
			}
		}

	} catch (e) {
		console.error("Test failed:", e);
		process.exit(1);
	} finally {
		if (nodeServer) {
			nodeServer.kill();
			console.log("Killed Node server");
		}
		if (goServer) {
			goServer.kill();
			console.log("Killed Go server");
		}
	}
}

main();
