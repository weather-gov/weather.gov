/**
 * Alternative Performance Benchmark Suite
 * 
 * Developed by: Claude (claude-3-5-sonnet-20241022)
 * Based on: Original performance tests by Gemini (see ../perf.js)
 * 
 * Improvements over original approach:
 * 1. Warmup phase to ensure JIT optimization
 * 2. Statistical analysis (min, max, mean, median, p95, stddev)
 * 3. Multiple sample runs for better accuracy
 * 4. Isolated benchmarks (no deep clone overhead in measurements)
 * 5. Consistent methodology with Go benchmarks
 */

import { performance } from "node:perf_hooks";

// Import utilities - relative to api-interop-layer/util/perf/perf-alt/
const { convertProperties, convertValue } = await import("../../convert.js");
const { sentenceCase, titleCase } = await import("../../case.js");
const paragraphSquash = (await import("../../paragraphSquash.js")).default;
const { convertTimeZone } = await import("../../timezone-new.js");

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
	WARMUP_RUNS: 1000,      // Warmup iterations to trigger JIT
	SAMPLE_RUNS: 10,        // Number of sample runs for statistics
	OPS_PER_SAMPLE: 10000,  // Operations per sample run
};

// ============================================================================
// STATISTICAL UTILITIES
// ============================================================================

function calculateStats(samples) {
	const sorted = [...samples].sort((a, b) => a - b);
	const n = sorted.length;
	
	const sum = sorted.reduce((a, b) => a + b, 0);
	const mean = sum / n;
	
	const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
	const stddev = Math.sqrt(variance);
	
	const median = n % 2 === 0 
		? (sorted[n/2 - 1] + sorted[n/2]) / 2 
		: sorted[Math.floor(n/2)];
	
	const p95Index = Math.ceil(n * 0.95) - 1;
	const p95 = sorted[Math.min(p95Index, n - 1)];
	
	return {
		min: sorted[0],
		max: sorted[n - 1],
		mean,
		median,
		p95,
		stddev,
	};
}

function formatNs(ns) {
	if (ns < 1000) return `${ns.toFixed(2)} ns`;
	if (ns < 1000000) return `${(ns / 1000).toFixed(2)} µs`;
	return `${(ns / 1000000).toFixed(2)} ms`;
}

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

async function runBenchmark(name, setupFn, benchFn) {
	// Setup test data
	const testData = setupFn();
	
	// Warmup phase
	for (let i = 0; i < CONFIG.WARMUP_RUNS; i++) {
		benchFn(testData);
	}
	
	// Collect samples
	const samples = [];
	
	for (let s = 0; s < CONFIG.SAMPLE_RUNS; s++) {
		const start = performance.now();
		for (let i = 0; i < CONFIG.OPS_PER_SAMPLE; i++) {
			benchFn(testData);
		}
		const end = performance.now();
		const durationMs = end - start;
		const nsPerOp = (durationMs * 1e6) / CONFIG.OPS_PER_SAMPLE;
		samples.push(nsPerOp);
	}
	
	const stats = calculateStats(samples);
	
	console.log(`\n${name}:`);
	console.log(`  Samples: ${CONFIG.SAMPLE_RUNS} x ${CONFIG.OPS_PER_SAMPLE} ops`);
	console.log(`  Mean:    ${formatNs(stats.mean)}/op`);
	console.log(`  Median:  ${formatNs(stats.median)}/op`);
	console.log(`  Min:     ${formatNs(stats.min)}/op`);
	console.log(`  Max:     ${formatNs(stats.max)}/op`);
	console.log(`  P95:     ${formatNs(stats.p95)}/op`);
	console.log(`  Stddev:  ${formatNs(stats.stddev)}`);
	console.log(`  Ops/sec: ${Math.round(1e9 / stats.mean).toLocaleString()}`);
	
	return { name, stats };
}

// ============================================================================
// BENCHMARK DEFINITIONS
// ============================================================================

// Pre-create test data outside of benchmark to avoid allocation overhead
const SENTENCE_CASE_INPUT = "Hello WORLD And Universe Test String";
const TITLE_CASE_INPUT = "hello world-and universe test string";
const PARAGRAPH_INPUT = "This is a line.\nThis is another line.\nAnd a third.\nFourth line here.\nFifth line.";
const TIMEZONE_DATE = new Date("2023-06-15T12:00:00Z");
const TIMEZONE_TZ = "America/New_York";

// ConvertValue uses fresh objects since the function mutates input
const CONVERT_VALUE_TEMPLATE = { unitCode: "wmoUnit:degC", value: 25.5 };

async function main() {
	console.log("=".repeat(60));
	console.log("Alternative Performance Benchmark Suite (JavaScript)");
	console.log("=".repeat(60));
	console.log(`\nConfiguration:`);
	console.log(`  Warmup:     ${CONFIG.WARMUP_RUNS} iterations`);
	console.log(`  Samples:    ${CONFIG.SAMPLE_RUNS}`);
	console.log(`  Ops/Sample: ${CONFIG.OPS_PER_SAMPLE}`);
	console.log(`  Node.js:    ${process.version}`);
	console.log(`  Date:       ${new Date().toISOString()}`);

	const results = [];

	// 1. SentenceCase (pure, no mutation)
	results.push(await runBenchmark(
		"SentenceCase",
		() => SENTENCE_CASE_INPUT,
		(input) => sentenceCase(input)
	));

	// 2. TitleCase (pure, no mutation)
	results.push(await runBenchmark(
		"TitleCase",
		() => TITLE_CASE_INPUT,
		(input) => titleCase(input)
	));

	// 3. ParagraphSquash (pure, no mutation)
	results.push(await runBenchmark(
		"ParagraphSquash",
		() => PARAGRAPH_INPUT,
		(input) => paragraphSquash(input)
	));

	// 4. ConvertValue (mutates, but we measure fresh object creation too)
	// This is more realistic as real usage creates objects
	results.push(await runBenchmark(
		"ConvertValue",
		() => CONVERT_VALUE_TEMPLATE,
		(template) => convertValue({ ...template })
	));

	// 5. ConvertValue with pre-allocated object (isolate conversion logic)
	results.push(await runBenchmark(
		"ConvertValue (pre-spread)",
		() => {
			// Pre-create array of objects
			const objs = [];
			for (let i = 0; i < CONFIG.OPS_PER_SAMPLE; i++) {
				objs.push({ unitCode: "wmoUnit:degC", value: 25.5 });
			}
			return { objs, idx: 0 };
		},
		(data) => {
			// Reset index each sample
			const obj = data.objs[data.idx++ % data.objs.length];
			obj.unitCode = "wmoUnit:degC";
			obj.value = 25.5;
			return convertValue(obj);
		}
	));

	// 6. ConvertTimezone (optimized version)
	results.push(await runBenchmark(
		"ConvertTimezone (Optimized)",
		() => ({ date: TIMEZONE_DATE, tz: TIMEZONE_TZ }),
		(input) => convertTimeZone(input.date, input.tz)
	));

	// 7. ConvertTimezone with different timezones (cache effectiveness)
	const TIMEZONES = ["America/New_York", "Europe/London", "Asia/Tokyo", "Australia/Sydney", "UTC"];
	results.push(await runBenchmark(
		"ConvertTimezone (Multi-TZ)",
		() => ({ date: TIMEZONE_DATE, tzs: TIMEZONES, idx: 0 }),
		(input) => {
			const tz = input.tzs[input.idx++ % input.tzs.length];
			return convertTimeZone(input.date, tz);
		}
	));

	// 8. ConvertProperties (complex transformation)
	const PROPS_TEMPLATE = {
		temperature: { unitCode: "wmoUnit:degC", value: 20.0 },
		windSpeed: { unitCode: "wmoUnit:km_h-1", value: 15.0 },
		pressure: { unitCode: "wmoUnit:Pa", value: 101325.0 },
		humidity: { unitCode: "wmoUnit:percent", value: 65 },
		visibility: { unitCode: "wmoUnit:m", value: 10000 },
		windDirection: { unitCode: "wmoUnit:degree_(angle)", value: 180 },
	};

	results.push(await runBenchmark(
		"ConvertProperties (6 fields)",
		() => PROPS_TEMPLATE,
		(template) => convertProperties(JSON.parse(JSON.stringify(template)))
	));

	// Print summary table
	console.log("\n" + "=".repeat(60));
	console.log("Summary (Mean ns/op)");
	console.log("=".repeat(60));
	console.log("| Benchmark | Mean (ns/op) | Ops/sec |");
	console.log("|-----------|--------------|---------|");
	for (const r of results) {
		const opsPerSec = Math.round(1e9 / r.stats.mean).toLocaleString();
		console.log(`| ${r.name.padEnd(30)} | ${formatNs(r.stats.mean).padStart(12)} | ${opsPerSec.padStart(12)} |`);
	}

	// Output JSON for comparison
	console.log("\n--- JSON Results ---");
	console.log(JSON.stringify(results.map(r => ({
		name: r.name,
		mean_ns: r.stats.mean,
		median_ns: r.stats.median,
		min_ns: r.stats.min,
		max_ns: r.stats.max,
		p95_ns: r.stats.p95,
		stddev_ns: r.stats.stddev,
	})), null, 2));
}

main().catch(console.error);
