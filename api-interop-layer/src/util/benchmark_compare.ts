
import AFDParser from "../data/products/afd/AFDParser.js";
import { parseDuration } from "../data/alerts/parse/duration.js";
import sortAlerts from "../data/alerts/sort.js";
import dayjs from "./day.js";

const runBenchmark = (name: string, fn: () => void, iterations: number = 1000) => {
	const start = process.hrtime.bigint();
	for (let i = 0; i < iterations; i++) {
		fn();
	}
	const end = process.hrtime.bigint();
	const totalNs = Number(end - start);
	const nsPerOp = totalNs / iterations;
	console.log(`${name}: ${nsPerOp.toFixed(2)} ns/op`);
	return nsPerOp;
};

const benchAFD = () => {
	const text = "000\nNOUS42 KWNO 010000\nAFDTEST\n\n.PREAMBLE...\nSome preamble text.\n\n.SYNOPSIS...\nSynopsis content.\nAnd more content.\n\n.DISCUSSION...\nDiscussion content.\n\n$$";
	runBenchmark("AFDParser", () => {
		const p = new AFDParser(text);
		p.parse();
		p.getStructureForTwig();
	});
};

const benchAlerts = () => {
	// Setup sample alerts
	const alerts: any[] = [];
	const count = 1000;
	const now = dayjs();
	for (let i = 0; i < count; i++) {
		alerts.push({
			properties: {
				event: "Tsunami Warning",
				priority: 0 // Mock priority
			},
			metadata: {
				priority: 0
			},
			onset: now.add(i, 'hour'),
			finish: now.add(i + 1, 'hour')
		});
	}

	runBenchmark("PostProcessAlerts (Sort + Duration)", () => {
		// Clone to simulate fresh processing if mutation happens?
		// Sort mutates in place.
		// Duration just returns string.
		// We'll operate on the slice.
		const work = [...alerts];

		// 1. Parse Duration
		for (const a of work) {
			parseDuration(a, "UTC");
		}

		// 2. Sort
		work.sort(sortAlerts);
	}, 100); // Fewer iterations as 1000 items is heavy
};

benchAFD();
benchAlerts();
