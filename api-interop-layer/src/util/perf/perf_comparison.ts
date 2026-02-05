import { performance } from "node:perf_hooks";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { convertTimeZone } from "../timezone-new.ts";
// Re-import original dayjs.timezone.js logic if we want to test THAT one specifically? 
// No, the original benchmark tested the library dayjs.tz.
// The user asked to compare "original js implementation" which in perf.md referred to the dayjs library usage.

dayjs.extend(utc);
dayjs.extend(timezone);

const RUNS = 10000;

async function runBenchmark(name: string, fn: () => void | Promise<void>, runs: number) {
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
	console.log("Running Timezone Benchmarks...");

	const date = new Date("2023-01-01T12:00:00Z");
	const tz = "America/New_York";

	// 1. Original Dayjs Timezone
	await runBenchmark("BenchmarkConvertTimezone (Original Dayjs)", () => {
		dayjs(date).tz(tz);
	}, RUNS);

	// 2. New Optimized Timezone
	await runBenchmark("BenchmarkConvertTimezoneNew (Optimized)", () => {
		convertTimeZone(date, tz);
	}, RUNS);
}

main().catch(console.error);
