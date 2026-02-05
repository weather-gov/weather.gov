/**
 * Performance Benchmark Suite
 *
 * improvements:
 * 1. Warmup phase to ensure JIT optimization
 * 2. Statistical analysis
 * 3. File output for history tracking
 */

import { performance } from "node:perf_hooks";
import fs from "node:fs/promises";
import path from "node:path";
import dayjs from "../day.js"; // Use the project's dayjs configuration
import { fileURLToPath } from "url";

// -- Imports for functions under test --
// Dynamic imports used in main() to allow this file to just compile even if others are broken temporarily,
// but for type safety we can use static imports if we trust the build.
// Using dynamic imports for the heavy items to keep startup fast? No, static is fine for this script.
import { convertProperties, convertValue } from "../convert.js";
import { sentenceCase, titleCase } from "../case.js";
import paragraphSquash from "../paragraphSquash.js";
import { convertTimeZone } from "../timezone-new.js"; // Using the optimized new one

// Fetch is imported dynamically
// import { fetchAPIJson } from "../fetch.js";

// Data processing imports
import processDailyForecast from "../../data/forecast/daily.js";
import { processDays, processLegend } from "../../data/risk-overview/processing.js";

// Generators
import { generateForecastData, generateRiskData, generateRiskLegend } from "./data-generators.js";
import http from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
	WARMUP_RUNS: 500,
	SAMPLE_RUNS: 10,
	OPS_PER_SAMPLE: 1000,
};

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

function calculateStats(samples: number[]) {
	const sorted = [...samples].sort((a, b) => a - b);
	const n = sorted.length;
	const sum = sorted.reduce((a, b) => a + b, 0);
	const mean = sum / n;
	const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
	const stddev = Math.sqrt(variance);
	const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
	const p95Index = Math.ceil(n * 0.95) - 1;
	const p95 = sorted[Math.min(p95Index, n - 1)];

	return { min: sorted[0], max: sorted[n - 1], mean, median, p95, stddev };
}

function formatNs(ns: number) {
	if (ns < 1000) return `${ns.toFixed(2)} ns`;
	if (ns < 1000000) return `${(ns / 1000).toFixed(2)} µs`;
	return `${(ns / 1000000).toFixed(2)} ms`;
}

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

interface BenchmarkResult {
	name: string;
	stats: ReturnType<typeof calculateStats>;
}

async function runBenchmark(name: string, setupFn: () => any, benchFn: (data: any) => any, opsPerSample = CONFIG.OPS_PER_SAMPLE): Promise<BenchmarkResult> {
	process.stdout.write(`Running ${name}... `);

	// Setup
	const testData = await setupFn();

	// Warmup
	for (let i = 0; i < CONFIG.WARMUP_RUNS; i++) {
		await benchFn(testData);
	}

	// Measure
	const samples: number[] = [];
	for (let s = 0; s < CONFIG.SAMPLE_RUNS; s++) {
		const start = performance.now();
		for (let i = 0; i < opsPerSample; i++) {
			await benchFn(testData);
		}
		const end = performance.now();
		const durationMs = end - start;
		const nsPerOp = (durationMs * 1e6) / opsPerSample;
		samples.push(nsPerOp);
	}

	const stats = calculateStats(samples);
	console.log(`Mean: ${formatNs(stats.mean)}/op`);
	return { name, stats };
}

// ============================================================================
// SETUP MOCK SERVER
// ============================================================================
let server: http.Server;
let serverPort: number;

async function startMockServer() {
	server = http.createServer((req, res) => {
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ status: "OK", data: "Mock Data" }));
	});
	return new Promise<void>((resolve) => {
		server.listen(0, () => {
			const addr = server.address();
			if (typeof addr !== 'string' && addr) {
				serverPort = addr.port;
				process.env.API_URL = `http://localhost:${serverPort}`;
				process.env.GHWO_URL = `http://localhost:${serverPort}`;
			}
			resolve();
		});
	});
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
	await startMockServer();

	// Dynamically import fetch so it picks up the Environment Variables
	const { fetchAPIJson } = await import("../fetch.js");

	const results: BenchmarkResult[] = [];

	// 1. String Ops
	results.push(await runBenchmark("SentenceCase", () => "hello WORLD test string", (s) => sentenceCase(s), 10000));
	results.push(await runBenchmark("ParagraphSquash", () => "Line 1.\nLine 2.\nLine 3.", (s) => paragraphSquash(s), 10000));

	// 2. Converters
	const convertInput = { temp: { unitCode: "wmoUnit:degC", value: 25.0 } };
	results.push(await runBenchmark("ConvertProperties", () => convertInput, (d) => convertProperties(structuredClone(d)), 5000));

	// 3. Timezone
	const tzInput = { date: new Date(), tz: "America/New_York" };
	results.push(await runBenchmark("ConvertTimezone", () => tzInput, (d) => convertTimeZone(d.date, d.tz), 5000));

	// 4. Data Processing - Forecast
	// This is a heavy operation, so we reduce ops per sample
	results.push(await runBenchmark("ForecastProcessing",
		() => ({ data: generateForecastData(14), opts: { timezone: "America/New_York" } }),
		(d) => processDailyForecast(d.data, d.opts),
		100 // Lower ops for heavier function
	));

	// 5. Data Processing - Risk Overview
	// First generate the legend, as it's needed for processing
	const rawLegend = generateRiskLegend();
	const processedLegend = processLegend(rawLegend);
	results.push(await runBenchmark("RiskProcessing",
		() => ({ data: generateRiskData(7), legend: processedLegend }),
		(d) => processDays(d.data, d.legend),
		500
	));

	// 6. Fetch (Mocked)
	// Very slow relative to CPU ops
	results.push(await runBenchmark("FetchAPIJson",
		() => "/mock/endpoint",
		async (url) => await fetchAPIJson(url),
		100
	));


	// Cleanup
	server.close();

	// ============================================================================
	// OUTPUT
	// ============================================================================

	const outputDir = path.resolve(__dirname, "../../../perf-results");
	const realOutputDir = path.join(__dirname, "../../../perf-results");

	const timestamp = dayjs().format("YYYYMMDD-HHmmss");
	const filename = `perf-${timestamp}.json`;
	const outputPath = path.join(realOutputDir, filename);

	const jsonOutput = {
		meta: {
			timestamp: new Date().toISOString(),
			nodeVersion: process.version,
			platform: process.platform,
			arch: process.arch
		},
		results: results.map(r => ({
			name: r.name,
			mean_ns: r.stats.mean,
			median_ns: r.stats.median,
			p95_ns: r.stats.p95,
			stddev: r.stats.stddev,
			ops_per_sec: 1e9 / r.stats.mean
		}))
	};

	// Console Table
	console.log("\nSummary:");
	console.table(jsonOutput.results.reduce((acc, r) => {
		acc[r.name] = {
			"Mean (ns)": Math.round(r.mean_ns),
			"Ops/Sec": Math.round(r.ops_per_sec).toLocaleString()
		};
		return acc;
	}, {}));

	// Write File
	try {
		await fs.writeFile(outputPath, JSON.stringify(jsonOutput, null, 2));
		console.log(`\nResults saved to: ${outputPath}`);
	} catch (e) {
		console.error("Failed to write results file:", e);
	}
}

main().catch(console.error);
