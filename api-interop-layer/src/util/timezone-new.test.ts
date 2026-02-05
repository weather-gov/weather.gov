import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { convertTimeZone } from "./timezone-new.js";
import assert from "node:assert";

dayjs.extend(utc);
dayjs.extend(timezone);

const dates = [
	"2023-01-01T12:00:00Z",
	"2023-06-01T12:00:00Z",
	"2023-11-05T01:30:00Z", // DST change boundary USA (repeats in fall?) - Wait, 1:30 is ambiguous in fall back.
	"2023-03-12T01:59:00Z", // DST start USA
	"2023-03-12T03:00:00Z",
	"2023-12-31T23:59:59Z",
];

const timezones = [
	"America/New_York",
	"Europe/London",
	"Asia/Tokyo",
	"UTC",
	"Australia/Sydney",
];

console.log("Running correctness tests...");

let passed = 0;
let failed = 0;

for (const dateStr of dates) {
	const date = new Date(dateStr);
	for (const tz of timezones) {
		const expected = dayjs(date).tz(tz);
		const actual = convertTimeZone(date, tz);

		try {
			assert.strictEqual(actual.year, expected.year(), `Year mismatch for ${dateStr} in ${tz}`);
			assert.strictEqual(actual.month, expected.month() + 1, `Month mismatch for ${dateStr} in ${tz}`); // Dayjs month is 0-indexed
			assert.strictEqual(actual.day, expected.date(), `Day mismatch for ${dateStr} in ${tz}`);
			assert.strictEqual(actual.hour, expected.hour(), `Hour mismatch for ${dateStr} in ${tz}`);
			assert.strictEqual(actual.minute, expected.minute(), `Minute mismatch for ${dateStr} in ${tz}`);
			assert.strictEqual(actual.second, expected.second(), `Second mismatch for ${dateStr} in ${tz}`);
			passed++;
		} catch (e) {
			console.error(`FAILED: ${dateStr} -> ${tz}`);
			console.error("Expected (Dayjs):", expected.format());
			console.error("Actual (New):", actual);
			console.error(e.message);
			failed++;
		}
	}
}

if (failed === 0) {
	console.log(`All ${passed} tests passed!`);
} else {
	console.error(`${failed} tests failed.`);
	process.exit(1);
}
