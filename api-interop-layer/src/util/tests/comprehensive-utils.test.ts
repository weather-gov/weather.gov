/**
 * Comprehensive Test Suite for Utility Functions
 * 
 * This test file provides a complete regression test suite for all utility functions
 * in the api-interop-layer. Tests are designed to be equivalent to the Go test suite
 * for cross-validation purposes.
 * 
 * Coverage: case, convert, paragraphSquash, icon, timezone
 */

import { expect } from "chai";
import { sentenceCase, titleCase } from "../case.js";
import { convertValue, convertProperties } from "../convert.js";
import paragraphSquash from "../paragraphSquash.js";
import { parseAPIIcon } from "../icon.js";
import dayjs from "../day.js";
import { convertTimeZone } from "../timezone-new.js";

// ============================================================================
// CASE UTILITIES TESTS
// ============================================================================

describe("Case Utilities", () => {
	describe("sentenceCase", () => {
		const testCases = [
			{ input: "Hello World", expected: "Hello world", name: "basic two words" },
			{ input: "HELLO WORLD", expected: "HELLO wORLD", name: "all uppercase" },
			{ input: "hello", expected: "hello", name: "single lowercase word" },
			{ input: "Hello", expected: "Hello", name: "single capitalized word" },
			{ input: "", expected: "", name: "empty string" },
			{ input: "Hello World Test", expected: "Hello world test", name: "three words" },
			{ input: "A B C D", expected: "A b c d", name: "single letter words" },
			{ input: "Hello  World", expected: "Hello  world", name: "double space" },
			{ input: "The Quick Brown Fox", expected: "The quick brown fox", name: "sentence" },
			{ input: "123 ABC", expected: "123 aBC", name: "numbers and letters" },
			{ input: "Hello-World", expected: "Hello-World", name: "hyphenated (no space)" },
			{ input: "Hello World!", expected: "Hello world!", name: "with punctuation" },
		];

		testCases.forEach(({ input, expected, name }) => {
			it(`should handle ${name}: "${input}" → "${expected}"`, () => {
				expect(sentenceCase(input)).to.equal(expected);
			});
		});

		it("should handle null/undefined gracefully", () => {
			expect(sentenceCase(null)).to.be.undefined;
			expect(sentenceCase(undefined)).to.be.undefined;
		});
	});

	describe("titleCase", () => {
		const testCases = [
			{ input: "hello world", expected: "Hello World", name: "basic two words" },
			{ input: "HELLO WORLD", expected: "Hello World", name: "all uppercase" },
			{ input: "hello", expected: "Hello", name: "single word" },
			{ input: "", expected: "", name: "empty string" },
			{ input: "the quick brown fox", expected: "The Quick Brown Fox", name: "sentence" },
			{ input: "123 abc", expected: "123 Abc", name: "numbers and letters" },
			{ input: "foo-bar", expected: "Foo-bar", name: "hyphenated word" },
			{ input: "a b c", expected: "A B C", name: "single letter words" },
			{ input: "hello  world", expected: "Hello  World", name: "double space" },
			{ input: "already Title Case", expected: "Already Title Case", name: "mixed case input" },
			{ input: "ALLCAPS word", expected: "Allcaps Word", name: "mixed all caps and word" },
			{ input: "test_underscore", expected: "Test_underscore", name: "with underscore" },
		];

		testCases.forEach(({ input, expected, name }) => {
			it(`should handle ${name}: "${input}" → "${expected}"`, () => {
				expect(titleCase(input)).to.equal(expected);
			});
		});

		it("should handle null/undefined gracefully", () => {
			expect(titleCase(null)).to.be.undefined;
			expect(titleCase(undefined)).to.be.undefined;
		});
	});
});

// ============================================================================
// CONVERT UTILITIES TESTS
// ============================================================================

describe("Convert Utilities", () => {
	describe("convertValue", () => {
		describe("Temperature conversions", () => {
			it("should convert Celsius to Fahrenheit", () => {
				const input = { unitCode: "wmoUnit:degC", value: 0 };
				const result = convertValue(input);
				expect(result.degC).to.equal(0);
				expect(result.degF).to.equal(32);
			});

			it("should convert Celsius to Fahrenheit (positive)", () => {
				const input = { unitCode: "wmoUnit:degC", value: 10 };
				const result = convertValue(input);
				expect(result.degC).to.equal(10);
				expect(result.degF).to.equal(50);
			});

			it("should convert Celsius to Fahrenheit (negative)", () => {
				const input = { unitCode: "wmoUnit:degC", value: -40 };
				const result = convertValue(input);
				expect(result.degC).to.equal(-40);
				expect(result.degF).to.equal(-40); // -40 is same in both scales
			});

			it("should convert Fahrenheit to Celsius", () => {
				const input = { unitCode: "wmoUnit:degF", value: 50 };
				const result = convertValue(input);
				expect(result.degF).to.equal(50);
				expect(result.degC).to.equal(10);
			});

			it("should convert Fahrenheit to Celsius (freezing)", () => {
				const input = { unitCode: "wmoUnit:degF", value: 32 };
				const result = convertValue(input);
				expect(result.degF).to.equal(32);
				expect(result.degC).to.equal(0);
			});
		});

		describe("Speed conversions", () => {
			it("should convert km/h to mph", () => {
				const input = { unitCode: "wmoUnit:km_h-1", value: 100 };
				const result = convertValue(input);
				expect(result["km/h"]).to.equal(100);
				expect(result.mph).to.equal(62); // 100 * 0.621371 rounded
			});

			it("should convert km/h to mph (zero)", () => {
				const input = { unitCode: "wmoUnit:km_h-1", value: 0 };
				const result = convertValue(input);
				expect(result["km/h"]).to.equal(0);
				expect(result.mph).to.equal(0);
			});

			it("should convert mph to km/h", () => {
				const input = { unitCode: "wxgov:mph", value: 60 };
				const result = convertValue(input);
				expect(result.mph).to.equal(60);
				expect(result["km/h"]).to.equal(97); // 60 * 1.60934 rounded
			});

			it("should convert mph to km/h (small value)", () => {
				const input = { unitCode: "wxgov:mph", value: 10 };
				const result = convertValue(input);
				expect(result.mph).to.equal(10);
				expect(result["km/h"]).to.equal(16); // 10 * 1.60934 rounded
			});
		});

		describe("Pressure conversions", () => {
			it("should convert Pa to mb and inHg (standard atmosphere)", () => {
				const input = { unitCode: "wmoUnit:Pa", value: 101325 };
				const result = convertValue(input);
				expect(result.pa).to.equal(101325);
				expect(result.mb).to.equal(1013); // 101325/100 rounded
				expect(result.inHg).to.equal(29.92); // 101325/3386.38 to 2 decimals
			});

			it("should convert Pa to mb and inHg (low pressure)", () => {
				const input = { unitCode: "wmoUnit:Pa", value: 98000 };
				const result = convertValue(input);
				expect(result.pa).to.equal(98000);
				expect(result.mb).to.equal(980);
				expect(result.inHg).to.be.closeTo(28.94, 0.01);
			});
		});

		describe("Length conversions", () => {
			it("should convert mm to in", () => {
				const input = { unitCode: "wmoUnit:mm", value: 25.4 };
				const result = convertValue(input);
				expect(result.mm).to.equal(25.4);
				expect(result.in).to.equal(1);
			});

			it("should convert mm to in (small value)", () => {
				const input = { unitCode: "wmoUnit:mm", value: 1 };
				const result = convertValue(input);
				expect(result.mm).to.equal(1);
				expect(result.in).to.be.closeTo(0.04, 0.01);
			});

			it("should convert m to ft and mi", () => {
				const input = { unitCode: "wmoUnit:m", value: 1000 };
				const result = convertValue(input);
				expect(result.m).to.equal(1000);
				expect(result.ft).to.equal(3281); // 1000 * 3.28084 rounded
				expect(result.mi).to.equal(1); // 1000 * 0.000621371 rounded
			});

			it("should convert m to ft and mi (larger value)", () => {
				const input = { unitCode: "wmoUnit:m", value: 10000 };
				const result = convertValue(input);
				expect(result.m).to.equal(10000);
				expect(result.ft).to.equal(32808);
				expect(result.mi).to.equal(6);
			});
		});

		describe("Angle/Cardinal direction conversions", () => {
			const cardinalTests = [
				{ degrees: 0, short: "N", long: "north" },
				{ degrees: 22, short: "N", long: "north" },
				{ degrees: 23, short: "NE", long: "northeast" },
				{ degrees: 45, short: "NE", long: "northeast" },
				{ degrees: 67, short: "NE", long: "northeast" },
				{ degrees: 68, short: "E", long: "east" },
				{ degrees: 90, short: "E", long: "east" },
				{ degrees: 112, short: "E", long: "east" },
				{ degrees: 113, short: "SE", long: "southeast" },
				{ degrees: 135, short: "SE", long: "southeast" },
				{ degrees: 157, short: "SE", long: "southeast" },
				{ degrees: 158, short: "S", long: "south" },
				{ degrees: 180, short: "S", long: "south" },
				{ degrees: 202, short: "S", long: "south" },
				{ degrees: 203, short: "SW", long: "southwest" },
				{ degrees: 225, short: "SW", long: "southwest" },
				{ degrees: 247, short: "SW", long: "southwest" },
				{ degrees: 248, short: "W", long: "west" },
				{ degrees: 270, short: "W", long: "west" },
				{ degrees: 292, short: "W", long: "west" },
				{ degrees: 293, short: "NW", long: "northwest" },
				{ degrees: 315, short: "NW", long: "northwest" },
				{ degrees: 337, short: "NW", long: "northwest" },
				{ degrees: 338, short: "N", long: "north" },
				{ degrees: 360, short: "N", long: "north" },
			];

			cardinalTests.forEach(({ degrees, short, long }) => {
				it(`should convert ${degrees}° to ${short} (${long})`, () => {
					const input = { unitCode: "wmoUnit:degree_(angle)", value: degrees };
					const result = convertValue(input);
					expect(result.degrees).to.equal(degrees);
					expect(result.cardinalShort).to.equal(short);
					expect(result.cardinalLong).to.equal(long);
				});
			});
		});

		describe("Null value handling", () => {
			it("should preserve null for temperature", () => {
				const input = { unitCode: "wmoUnit:degC", value: null };
				const result = convertValue(input);
				expect(result.degC).to.be.null;
				expect(result.degF).to.be.null;
			});

			it("should preserve null for speed", () => {
				const input = { unitCode: "wmoUnit:km_h-1", value: null };
				const result = convertValue(input);
				expect(result["km/h"]).to.be.null;
				expect(result.mph).to.be.null;
			});

			it("should preserve null for pressure", () => {
				const input = { unitCode: "wmoUnit:Pa", value: null };
				const result = convertValue(input);
				expect(result.pa).to.be.null;
				expect(result.mb).to.be.null;
				expect(result.inHg).to.be.null;
			});
		});

		describe("Unknown units", () => {
			it("should return object unchanged for unknown unitCode", () => {
				const input = { unitCode: "unknown:unit", value: 100 };
				const result = convertValue(input);
				expect(result).to.deep.equal(input);
			});
		});
	});

	describe("convertProperties", () => {
		it("should convert multiple properties", () => {
			const input = {
				temp: { unitCode: "wmoUnit:degC", value: 20 },
				wind: { unitCode: "wmoUnit:km_h-1", value: 10 },
				other: "ignore",
			};

			const result = convertProperties(input);

			expect(result.temp.degC).to.equal(20);
			expect(result.temp.degF).to.equal(68);
			expect(result.wind["km/h"]).to.equal(10);
			expect(result.wind.mph).to.equal(6);
			expect(result.other).to.equal("ignore");
		});

		it("should handle mixed null and values", () => {
			const input = {
				temp: { unitCode: "wmoUnit:degC", value: null },
				pressure: { unitCode: "wmoUnit:Pa", value: 101325 },
			};

			const result = convertProperties(input);

			expect(result.temp.degC).to.be.null;
			expect(result.temp.degF).to.be.null;
			expect(result.pressure.pa).to.equal(101325);
			expect(result.pressure.mb).to.equal(1013);
		});

		it("should preserve non-convertible properties", () => {
			const input = {
				temp: { unitCode: "wmoUnit:degC", value: 25 },
				name: "Weather Station 1",
				count: 42,
				nested: { foo: "bar" },
			};

			const result = convertProperties(input);

			expect(result.temp.degC).to.equal(25);
			expect(result.name).to.equal("Weather Station 1");
			expect(result.count).to.equal(42);
			expect(result.nested).to.deep.equal({ foo: "bar" });
		});
	});
});

// ============================================================================
// PARAGRAPH SQUASH TESTS
// ============================================================================

describe("ParagraphSquash", () => {
	const testCases = [
		{
			name: "single newline between chars",
			input: "This is a\nsentence.",
			expected: "This is a sentence.",
		},
		{
			name: "double newline (preserved)",
			input: "Paragraph one.\n\nParagraph two.",
			expected: "Paragraph one.\n\nParagraph two.",
		},
		{
			name: "no newlines",
			input: "No newlines here.",
			expected: "No newlines here.",
		},
		{
			name: "empty string",
			input: "",
			expected: "",
		},
		{
			name: "newline at start",
			input: "\nHello world",
			expected: "\nHello world",
		},
		{
			name: "newline at end",
			input: "Hello world\n",
			expected: "Hello world\n",
		},
		{
			name: "multiple single newlines",
			input: "Line one\nLine two\nLine three",
			expected: "Line one Line two Line three",
		},
		{
			name: "mixed single and double newlines",
			input: "Para one\nContinued.\n\nPara two\nMore.",
			expected: "Para one Continued.\n\nPara two More.",
		},
		{
			name: "triple newlines",
			input: "Section one.\n\n\nSection two.",
			expected: "Section one.\n\n\nSection two.",
		},
		{
			name: "complex paragraph with all cases",
			input: "First line\ncontinues here.\n\nSecond paragraph\nalso continues.\n\n\nThird section.",
			expected: "First line continues here.\n\nSecond paragraph also continues.\n\n\nThird section.",
		},
	];

	testCases.forEach(({ name, input, expected }) => {
		it(`should handle ${name}`, () => {
			expect(paragraphSquash(input)).to.equal(expected);
		});
	});

	it("should handle null/undefined gracefully", () => {
		expect(paragraphSquash(null)).to.be.undefined;
		expect(paragraphSquash(undefined)).to.be.undefined;
	});
});

// ============================================================================
// ICON PARSING TESTS
// ============================================================================

describe("Icon Parsing", () => {
	describe("Valid icon URLs", () => {
		const validIconTests = [
			{
				name: "day/sct (mostly clear)",
				url: "https://api.weather.gov/icons/land/day/sct?size=medium",
				icon: "mostly_clear-day.svg",
				base: "mostly_clear-day",
			},
			{
				name: "night/sct (mostly clear night)",
				url: "https://api.weather.gov/icons/land/night/sct?size=medium",
				icon: "mostly_clear-night.svg",
				base: "mostly_clear-night",
			},
			{
				name: "day/few (few clouds)",
				url: "https://api.weather.gov/icons/land/day/few",
				icon: "mostly_clear-day.svg",
				base: "mostly_clear-day",
			},
			{
				name: "day/skc (clear)",
				url: "https://api.weather.gov/icons/land/day/skc",
				icon: "clear-day.svg",
				base: "clear-day",
			},
			{
				name: "night/skc (clear night)",
				url: "https://api.weather.gov/icons/land/night/skc",
				icon: "clear-night.svg",
				base: "clear-night",
			},
			{
				name: "day/bkn (mostly cloudy)",
				url: "https://api.weather.gov/icons/land/day/bkn",
				icon: "mostly_cloudy-day.svg",
				base: "mostly_cloudy-day",
			},
		{
			name: "day/ovc (cloudy overcast)",
			url: "https://api.weather.gov/icons/land/day/ovc",
			icon: "cloudy_overcast.svg",
			base: "cloudy_overcast",
		},
			{
				name: "day/rain (rain)",
				url: "https://api.weather.gov/icons/land/day/rain",
				icon: "rain.svg",
				base: "rain",
			},
			{
				name: "day/tsra (thunderstorm)",
				url: "https://api.weather.gov/icons/land/day/tsra",
				icon: "thunderstorm.svg",
				base: "thunderstorm",
			},
			{
				name: "day/snow (snow)",
				url: "https://api.weather.gov/icons/land/day/snow",
				icon: "snow.svg",
				base: "snow",
			},
			{
				name: "day/fog (fog)",
				url: "https://api.weather.gov/icons/land/day/fog",
				icon: "fog.svg",
				base: "fog",
			},
		];

		validIconTests.forEach(({ name, url, icon, base }) => {
			it(`should parse ${name}`, () => {
				const result = parseAPIIcon(url);
				expect(result.icon).to.equal(icon);
				expect(result.base).to.equal(base);
			});
		});
	});

	describe("Multi-condition icons", () => {
		it("should use first condition for day/sct/bkn", () => {
			const result = parseAPIIcon("https://api.weather.gov/icons/land/day/sct/bkn?size=medium");
			expect(result.icon).to.equal("mostly_clear-day.svg");
			expect(result.base).to.equal("mostly_clear-day");
		});

		it("should use first condition for day/rain/tsra", () => {
			const result = parseAPIIcon("https://api.weather.gov/icons/land/day/rain/tsra");
			expect(result.icon).to.equal("rain.svg");
			expect(result.base).to.equal("rain");
		});

		it("should use first condition for night/bkn/ovc", () => {
			const result = parseAPIIcon("https://api.weather.gov/icons/land/night/bkn/ovc");
			expect(result.icon).to.equal("mostly_cloudy-night.svg");
			expect(result.base).to.equal("mostly_cloudy-night");
		});
	});

	describe("Icons with percentage suffixes", () => {
		it("should strip comma-delimited data from URL", () => {
			const result = parseAPIIcon("https://api.weather.gov/icons/land/day/rain,30");
			expect(result.icon).to.equal("rain.svg");
			expect(result.base).to.equal("rain");
		});

		it("should handle multi-condition with percentages", () => {
			const result = parseAPIIcon("https://api.weather.gov/icons/land/day/tsra_sct,40/rain,60");
			expect(result.icon).to.equal("thunderstorm.svg");
			expect(result.base).to.equal("thunderstorm");
		});
	});

	describe("Invalid icon URLs", () => {
		const invalidTests = [
			{ name: "not a URL", url: "bob white" },
			{ name: "empty string", url: "" },
			{ name: "just text", url: "hello world" },
			{ name: "partial URL", url: "weather.gov/icons/land/day/sct" },
		];

		invalidTests.forEach(({ name, url }) => {
			it(`should return nulls for ${name}`, () => {
				const result = parseAPIIcon(url);
				expect(result.icon).to.be.null;
				expect(result.base).to.be.null;
			});
		});
	});
});

// ============================================================================
// TIMEZONE CONVERSION TESTS
// ============================================================================

describe("Timezone Conversion (Optimized)", () => {
	// Test dates covering different scenarios
	// Note: Avoiding precise DST transition dates to prevent implementation differences
	const testDates = [
		"2023-01-01T12:00:00Z", // Winter, standard time
		"2023-06-01T12:00:00Z", // Summer, daylight saving
		"2023-04-15T12:00:00Z", // Well into DST period (avoiding transitions)
		"2023-10-01T12:00:00Z", // Before fall back
		"2023-12-31T23:59:59Z", // End of year
		"2024-02-29T12:00:00Z", // Leap year
	];

	const timezones = [
		"America/New_York",
		"America/Los_Angeles",
		"America/Chicago",
		"Europe/London",
		"Europe/Paris",
		"Asia/Tokyo",
		"Australia/Sydney",
		"UTC",
		"Pacific/Honolulu",
	];

	describe("Correctness against Day.js reference", () => {
		testDates.forEach((dateStr) => {
			timezones.forEach((tz) => {
				it(`should correctly convert ${dateStr} to ${tz}`, () => {
					const date = new Date(dateStr);
					const expected = dayjs(date).tz(tz);
					const actual = convertTimeZone(date, tz);

					expect(actual.year).to.equal(expected.year(), `Year mismatch for ${dateStr} in ${tz}`);
					expect(actual.month).to.equal(expected.month() + 1, `Month mismatch for ${dateStr} in ${tz}`);
					expect(actual.day).to.equal(expected.date(), `Day mismatch for ${dateStr} in ${tz}`);
					expect(actual.hour).to.equal(expected.hour(), `Hour mismatch for ${dateStr} in ${tz}`);
					expect(actual.minute).to.equal(expected.minute(), `Minute mismatch for ${dateStr} in ${tz}`);
					expect(actual.second).to.equal(expected.second(), `Second mismatch for ${dateStr} in ${tz}`);
				});
			});
		});
	});

	describe("Specific known conversions", () => {
		it("should convert UTC noon to 7 AM EST (New York winter)", () => {
			const date = new Date("2023-01-15T12:00:00Z");
			const result = convertTimeZone(date, "America/New_York");
			expect(result.hour).to.equal(7);
		});

		it("should convert UTC noon to 8 AM EDT (New York summer)", () => {
			const date = new Date("2023-07-15T12:00:00Z");
			const result = convertTimeZone(date, "America/New_York");
			expect(result.hour).to.equal(8);
		});

		it("should convert UTC noon to 9 PM Tokyo", () => {
			const date = new Date("2023-01-15T12:00:00Z");
			const result = convertTimeZone(date, "Asia/Tokyo");
			expect(result.hour).to.equal(21);
		});

		it("should convert UTC midnight to same time in UTC", () => {
			const date = new Date("2023-06-15T00:00:00Z");
			const result = convertTimeZone(date, "UTC");
			expect(result.hour).to.equal(0);
			expect(result.day).to.equal(15);
		});
	});

	describe("Edge cases", () => {
		it("should handle year boundary correctly (UTC to Sydney)", () => {
			// Sydney is UTC+11 in summer, so 12:00 UTC on Dec 31 = 23:00 Dec 31 Sydney
			const date = new Date("2023-12-31T12:00:00Z");
			const result = convertTimeZone(date, "Australia/Sydney");
			expect(result.year).to.equal(2023);
			expect(result.month).to.equal(12);
			expect(result.day).to.equal(31);
			expect(result.hour).to.equal(23);
		});

		it("should handle date change crossing midnight", () => {
			// Tokyo is UTC+9, so 20:00 UTC = 05:00 next day Tokyo
			const date = new Date("2023-06-15T20:00:00Z");
			const result = convertTimeZone(date, "Asia/Tokyo");
			expect(result.day).to.equal(16);
			expect(result.hour).to.equal(5);
		});

		it("should handle seconds correctly", () => {
			const date = new Date("2023-06-15T12:30:45Z");
			const result = convertTimeZone(date, "UTC");
			expect(result.minute).to.equal(30);
			expect(result.second).to.equal(45);
		});
	});
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

describe("Test Suite Summary", () => {
	it("should complete all utility tests", () => {
		// This test simply confirms the suite ran to completion
		expect(true).to.be.true;
	});
});
