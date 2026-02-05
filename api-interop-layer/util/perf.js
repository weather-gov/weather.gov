import http from "node:http";
import { performance } from "node:perf_hooks";

// Setup environment BEFORE importing fetch utils
// Start Mock Server
const server = http.createServer((req, res) => {
	res.writeHead(200, { "Content-Type": "application/json" });
	res.end(JSON.stringify({ status: "OK", message: "Success" }));
});

await new Promise((resolve) => server.listen(0, resolve));
const { port } = server.address();
const PORT = port;

process.env.API_URL = `http://localhost:${PORT}`;
process.env.GHWO_URL = `http://localhost:${PORT}`;

// Dynamic imports after env setup
const { convertProperties } = await import("./convert.js");
const { sentenceCase, titleCase } = await import("./case.js");
const paragraphSquash = (await import("./paragraphSquash.js")).default;
const { fetchAPIJson } = await import("./fetch.js");

// Check redis status
// If redis.js attempts to connect, we might see errors if no redis is running.
// But we want to test the 'fetch' wrapper logic mainly.

const RUNS = 10000;
const FETCH_RUNS = 1000; // Fewer runs for fetch as it's slower

async function runBenchmark(name, fn, runs) {
	const start = performance.now();
	for (let i = 0; i < runs; i++) {
		await fn();
	}
	const end = performance.now();
	const duration = end - start; // ms
	const nsPerOp = (duration * 1e6) / runs;
	const opsPerSec = (runs / duration) * 1000;

	console.log(`${name}: ${nsPerOp.toFixed(2)} ns/op (${opsPerSec.toFixed(2)} ops/s)`);
}

async function main() {
	console.log("Running JS Benchmarks...");

	// Data Setup
	const convertInput = {
		temp: { unitCode: "wmoUnit:degC", value: 20.0 },
		wind: { unitCode: "wmoUnit:km_h-1", value: 10.0 },
		pressure: { unitCode: "wmoUnit:Pa", value: 101325.0 },
		other: "ignore",
	};

	// 1. ConvertProperties
	await runBenchmark("BenchmarkConvertProperties", () => {
		// deep clone to avoid mutation side-effects affecting subsequent runs validity?
		// In Go we did deep copy. In JS, structuredClone is available in recent Node.
		const input = structuredClone(convertInput);
		convertProperties(input);
	}, RUNS);

	// 2. SentenceCase
	const scStr = "hello WORLD And universe";
	await runBenchmark("BenchmarkSentenceCase", () => {
		sentenceCase(scStr);
	}, RUNS * 10);

	// 3. TitleCase
	const tcStr = "hello world-and universe";
	await runBenchmark("BenchmarkTitleCase", () => {
		titleCase(tcStr);
	}, RUNS * 10);

	// 4. ParagraphSquash
	const psStr = "This is a line.\nThis is another line.\nAnd a third.";
	await runBenchmark("BenchmarkParagraphSquash", () => {
		paragraphSquash(psStr);
	}, RUNS * 10);

	// 5. FetchAPIJson
	await runBenchmark("BenchmarkFetchAPIJson", async () => {
		await fetchAPIJson("/some/path");
	}, FETCH_RUNS);

	server.close();
}

main().catch(console.error);
