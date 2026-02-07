import dayjs from "../day.js";

/**
 * Generates a mock Forecast API response
 */
export function generateForecastData(numPeriods = 14) {
	const periods: any[] = [];
	const now = dayjs();

	// Generate validTimes string
	const startValid = now.format();
	const endValid = now.add(7, 'day').format();
	const validTimes = `${startValid}/${endValid}`;

	for (let i = 0; i < numPeriods; i++) {
		const isDaytime = i % 2 === 0;
		const startTime = now.add(i * 12, 'hour');
		const endTime = startTime.add(12, 'hour');

		periods.push({
			number: i + 1,
			name: isDaytime ? "Day " + (i / 2 + 1) : "Night " + Math.ceil(i / 2),
			startTime: startTime.format(),
			endTime: endTime.format(),
			isDaytime: isDaytime,
			temperature: 70 + (isDaytime ? 5 : -5) + (Math.random() * 10),
			temperatureUnit: "F",
			temperatureTrend: null,
			windSpeed: `${Math.floor(Math.random() * 20)} mph`,
			windDirection: "SW",
			icon: "https://api.weather.gov/icons/land/day/few?size=medium",
			shortForecast: isDaytime ? "Sunny" : "Partly Cloudy",
			detailedForecast: "Detailed forecast text goes here...",
			probabilityOfPrecipitation: {
				unitCode: "wmoUnit:percent",
				value: Math.floor(Math.random() * 30)
			}
		});
	}

	return {
		properties: {
			updateTime: now.subtract(1, 'hour').format(),
			validTimes: validTimes,
			elevation: {
				unitCode: "wmoUnit:m",
				value: 100
			},
			periods: periods,
			generatedAt: now.format()
		}
	};
}

export function generateHourlyForecastData(numHours = 168) {
	const periods: any[] = [];
	const now = dayjs();
	const startValid = now.format();
	const endValid = now.add(7, 'day').format();
	const validTimes = `${startValid}/${endValid}`;

	for (let i = 0; i < numHours; i++) {
		const startTime = now.add(i, 'hour');
		const endTime = startTime.add(1, 'hour');

		periods.push({
			number: i + 1,
			name: "",
			startTime: startTime.format(),
			endTime: endTime.format(),
			isDaytime: (i % 24) >= 6 && (i % 24) < 18,
			temperature: 60 + Math.random() * 20,
			temperatureUnit: "F",
			temperatureTrend: null,
			windSpeed: `${Math.floor(Math.random() * 15)} mph`,
			windDirection: "W",
			icon: "https://api.weather.gov/icons/land/day/few?size=medium",
			shortForecast: "Clear",
			detailedForecast: "",
			probabilityOfPrecipitation: {
				unitCode: "wmoUnit:percent",
				value: Math.floor(Math.random() * 20)
			}
		});
	}

	return {
		properties: {
			updateTime: now.subtract(1, 'hour').format(),
			validTimes: validTimes,
			elevation: { unitCode: "wmoUnit:m", value: 100 },
			periods: periods,
			generatedAt: now.format()
		}
	};
}

export function generateGridpointData() {
	const now = dayjs();
	const startValid = now.format();

	function generateValues(uom: string, count: number, base: number) {
		const values: any[] = [];
		for (let i = 0; i < count; i++) {
			// Each value is valid for 1 hour
			const start = now.add(i, 'hour').format();
			// ISO duration for 1 hour
			const validTime = `${start}/PT1H`;
			values.push({
				validTime: validTime,
				value: base + Math.random() * 10
			});
		}
		return { uom, values };
	}

	return {
		geometry: {
			type: "Polygon",
			coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]
		},
		properties: {
			updateTime: now.subtract(1, 'hour').format(),
			validTimes: `${startValid}/P7D`,
			elevation: { unitCode: "wmoUnit:m", value: 100 },
			temperature: generateValues("wmoUnit:degC", 168, 20),
			relativeHumidity: generateValues("wmoUnit:percent", 168, 50),
			windSpeed: generateValues("wmoUnit:km_h", 168, 10),
			windDirection: generateValues("wmoUnit:degree_(angle)", 168, 180),
			quantitativePrecipitation: generateValues("wmoUnit:mm", 168, 0),
			iceAccumulation: generateValues("wmoUnit:mm", 168, 0),
			snowfallAmount: generateValues("wmoUnit:mm", 168, 0)
		}
	};
}

/**
 * Generates mock Risk Overview Data
 */
export function generateRiskData(numDays = 7) {
	const data: Record<string, any> = {};
	const risks = ["Tornado", "Hail", "Wind", "WrappedRisk"]; // 'Wind' typically maps to NonConvectiveWind
	const now = dayjs(); // Use local dayjs

	for (let i = 0; i < numDays; i++) {
		const dateKey = now.add(i, 'day').format('YYYY-MM-DD') + "T12:00:00+00:00"; // Format matching regex in processing.ts
		const dayRisks: Record<string, any> = {};

		risks.forEach(risk => {
			dayRisks[risk] = {
				category: Math.floor(Math.random() * 5),
				probability: Math.random()
			};
		});

		// Add a non-risk entry (DailyComposite) which processing.ts filters out
		dayRisks["DailyComposite"] = { category: 3 };

		data[dateKey] = dayRisks;
	}

	// Add some random metadata keys that should be filtered out
	data["creationDate"] = now.format();
	data["wfo"] = "OUN";

	return data;
}

/**
 * Generates mock Legend Data
 */
export function generateRiskLegend() {
	return {
		hazards: [
			{
				name: "Tornado Risk", // Maps to 'Tornado' via common logic
				category: {
					"0": { name: "None", color: "#FFFFFF" },
					"1": { name: "Low", color: "#00FF00" },
					"2": { name: "Medium", color: "#FFFF00" },
					"3": { name: "High", color: "#FFA500" },
					"4": { name: "Extreme", color: "#FF0000" }
				}
			},
			{
				name: "Hail Risk",
				category: {
					"0": { name: "None", color: "#FFFFFF" },
					"1": { name: "Low", color: "#00FF00" },
					"2": { name: "High", color: "#FF0000" }
				}
			},
			{
				name: "Wind Risk", // Maps to NonConvectiveWind via explicit map
				category: {
					"0": { name: "None", color: "#FFFFFF" },
					"1": { name: "Windy", color: "#AAAAAA" }
				}
			}
		]
	};
}
