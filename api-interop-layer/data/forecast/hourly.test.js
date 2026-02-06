import { expect } from "chai";
import hourly from "./hourly.js";

const place = {
  timezone: "America/Los_Angeles",
};

/**
 * Generate the hourly test data we will use.
 * We will create four full days of hourly data
 * starting at 7 minutes past each hour.
 */
const startTime = new Date("2024-09-09T05:07:00-07:00");

const times = [];

for (let i = 0; i < 96; i++) {
  const newStart = new Date(startTime);
  newStart.setHours(newStart.getHours() + i);
  const newEnd = new Date(newStart);
  newEnd.setHours(newStart.getHours() + 1);

  times.push({
    startTime: newStart,
    endTime: newEnd,
    shortForecast: "Dummy forecast",
    icon: "weather-icon",
  });
}

const hourlyData = {
  properties: {
    periods: times,
  },
};

describe("Hourly forecast processing (basic)", () => {
  it("each hour (map key) is aligned to the top of the hour", () => {
    // Note: we test on just the first five hour slice
    // for brevity
    const expected = [
      "2024-09-09T12:00:00.000Z",
      "2024-09-09T13:00:00.000Z",
      "2024-09-09T14:00:00.000Z",
      "2024-09-09T15:00:00.000Z",
      "2024-09-09T16:00:00.000Z",
    ];
    const result = new Map();
    hourly(hourlyData, result, place);
    const actual = Array.from(result)
      .map((item) => new Date(item[0]).toISOString())
      .slice(0, 5);

    expect(expected).to.eql(actual);
  });

  it("each hour (map value `time`) is aligned to the top of the hour", () => {
    // Note: we test on just the first five hour slice
    // for brevity
    const expected = [
      "2024-09-09T12:00:00.000Z",
      "2024-09-09T13:00:00.000Z",
      "2024-09-09T14:00:00.000Z",
      "2024-09-09T15:00:00.000Z",
      "2024-09-09T16:00:00.000Z",
    ];
    const result = new Map();
    hourly(hourlyData, result, place);
    const actual = [...result.values()]
      .map((val) => val.time.toISOString())
      .slice(0, 5);

    expect(expected).to.eql(actual);
  });
});
