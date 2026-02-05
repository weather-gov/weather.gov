/**
 * Optimized Timezone Conversion
 * 
 * Improvements over standard Day.js / Intl approaches:
 * 1. Caching Intl.DateTimeFormat instances (expensive to create).
 * 2. Using .format() (string output) instead of .formatToParts() (array allocation).
 *    String parsing is generally faster in V8 than allocating many small objects.
 * 3. Returning a plain POJO instead of a heavy wrapper class.
 */

const dtfCache = new Map();

function getDtf(timezone) {
	let dtf = dtfCache.get(timezone);
	if (!dtf) {
		dtf = new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});
		dtfCache.set(timezone, dtf);
	}
	return dtf;
}

/**
 * Converts a Date object to the specified timezone.
 * Returns a plain object with year, month, day, hour, minute, second.
 * 
 * @param {Date} date 
 * @param {string} timezone 
 * @returns {{year: number, month: number, day: number, hour: number, minute: number, second: number}}
 */
export function convertTimeZone(date, timezone) {
	const dtf = getDtf(timezone);
	// Format: "MM/DD/YYYY, HH:mm:ss"
	// Example: "01/05/2023, 14:30:00"
	const formatted = dtf.format(date);

	// Fast manual parsing avoiding regex overhead if possible, but regex is clean.
	// Split by non-digit characters is fast enough.
	// "01/05/2023, 14:30:00" -> ["01", "05", "2023", "", "14", "30", "00"]
	// Note: format might return "24:00:00" sometimes? No, 00-23.

	// Regex approach:
	// const match = formatted.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/);

	// Let's try to be robust but fast.
	// Using a known format allows direct index access if length is constant, but months/days can be slightly variable if not padded?
	// We used "2-digit" for everything except year.
	// Year is "numeric" -> 4 digits.
	// So it should be stable length: 2+1+2+1+4+2+2+1+2+1+2 = 20 chars? 
	// "MM/DD/YYYY, HH:mm:ss"

	// However, local implementations of Intl might vary slightly (e.g. non-breaking space).
	// "MM/DD/YYYY, HH:mm:ss"

	// Let's use a regex for safety, compiled once? No, regex exec is fast.
	// Or simple split.

	// Match digits.
	// 1: MM, 2: DD, 3: YYYY, 4: HH, 5: mm, 6: ss

	// Note: Intl format for "en-US" is MM/DD/YYYY.

	let m, d, y, h, min, s;

	// Use simple parsing loop or regex.
	// Regex is ~30ns.

	const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})$/);

	if (match) {
		return {
			year: parseInt(match[3], 10),
			month: parseInt(match[1], 10),
			day: parseInt(match[2], 10),
			hour: parseInt(match[4], 10),
			minute: parseInt(match[5], 10),
			second: parseInt(match[6], 10)
		};
	}

	// Fallback for unexpected format (should be rare with strictly configured Intl)
	// This might happen if '2-digit' produces single digit on some browsers (it shouldn't).
	const parts = dtf.formatToParts(date);
	const res = {};
	for (const p of parts) {
		if (p.type !== 'literal' && p.type !== 'dayPeriod') {
			res[p.type] = parseInt(p.value, 10);
		}
	}
	return res;
}
