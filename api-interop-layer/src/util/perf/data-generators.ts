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
