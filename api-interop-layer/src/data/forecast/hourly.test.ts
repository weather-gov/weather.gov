import { expect } from "chai";
import dayjs from "../../util/day.js";
import hourly from "./hourly.js";

const place = {
  timezone: "America/Los_Angeles",
};

/**
 * Generate the hourly test data we will use.
 * We will create four full days of hourly data
 * starting at 7 minutes past each hour.
 */
const startTime = dayjs
  .utc("2024-09-09T05:07:00-07:00")
  .tz("America/Los_Angeles");
const endTime = dayjs
  .utc("2024-09-14T03:07:00-07:00")
  .tz("America/Los_Angeles");
const hourDiff = endTime.diff(startTime, "hour");

const times = [];

for (let i = 0; i < hourDiff; i++) {
  const newStart = startTime.add(i, "hour");
  const newEnd = newStart.add(1, "hour");
  times.push({
    startTime: newStart.format(),
    endTime: newEnd.format(),
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
      "2024-09-09T05:00:00-07:00",
      "2024-09-09T06:00:00-07:00",
      "2024-09-09T07:00:00-07:00",
      "2024-09-09T08:00:00-07:00",
      "2024-09-09T09:00:00-07:00",
    ];
    const result = new Map();
    hourly(hourlyData, result, place);
    const actual = Array.from(result)
      .map((item) => dayjs.utc(item[0]).tz(place.timezone).format())
      .slice(0, 5);

    expect(expected).to.eql(actual);
  });

  it("each hour (map value `time`) is aligned to the top of the hour", () => {
    // Note: we test on just the first five hour slice
    // for brevity
    const expected = [
      "2024-09-09T05:00:00-07:00",
      "2024-09-09T06:00:00-07:00",
      "2024-09-09T07:00:00-07:00",
      "2024-09-09T08:00:00-07:00",
      "2024-09-09T09:00:00-07:00",
    ];
    const result = new Map();
    hourly(hourlyData, result, place);
    const actual = [...result.values()]
      .map((val) => val.time.tz(place.timezone).format())
      .slice(0, 5);

    expect(expected).to.eql(actual);
  });
});
