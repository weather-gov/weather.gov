import { expect } from "chai";
import dayjs from "../../util/day.js";
import hourly, {sortAndFilterHours} from "./hourly.js";

const place = {
  timezone: "America/Los_Angeles"
};

/**
 * Generate the hourly test data we will use.
 * We will create two full days of hourly data
 * (plus an additional two hours for specific tests),
 * starting at 7 minutes past each hour.
 */
const startTime = dayjs.utc("2024-09-09T05:07:00-07:00").tz("America/Los_Angeles");
const endTime = dayjs.utc("2024-09-11T07:07:00-07:00").tz("America/Los_Angeles");
const hourDiff = endTime.diff(startTime, "hour");

let times = [];
for(let i = 0; i < hourDiff; i++){
  const newStart = startTime.add(i, "hour");
  const newEnd = newStart.add(1, "hour");
  times.push({
    startTime: newStart.format(),
    endTime: newEnd.format(),
    shortForecast: "Dummy forecast",
    icon: "weather-icon"
  });
}

const hourlyData = {
  properties: {
    periods: times
  }
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
      "2024-09-09T09:00:00-07:00"
    ];
    const result = new Map();
    hourly(hourlyData, result, place.timezone);
    const actual = Array.from(result).map(item => {
      return dayjs.utc(item[0]).tz(place.timezone).format();
    }).slice(0,5);

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
      "2024-09-09T09:00:00-07:00"
    ];
    const result = new Map();
    hourly(hourlyData, result, place.timezone);
    const actual = [...result.values()]
          .map(val => val.time.tz(place.timezone).format())
          .slice(0,5);

    expect(expected).to.eql(actual);
  });

  it("the first hour begins at the start of the next whole hour", () => {
    const now = dayjs.utc("2024-09-09T09:15:00-07:00").tz(place.timezone);
    const result = new Map();
    hourly(hourlyData, result, place.timezone);
    const hours = [...result.values()];
    const actual = sortAndFilterHours(hours, now)
          .map(hour => hour.time.tz(place.timezone).format())
          .slice(0,5);

    const expected = [
      "2024-09-09T10:00:00-07:00",
      "2024-09-09T11:00:00-07:00",
      "2024-09-09T12:00:00-07:00",
      "2024-09-09T13:00:00-07:00",
      "2024-09-09T14:00:00-07:00",
    ];

    expect(expected).to.eql(actual);
  });

  it("if the current local time is before midnight, the list of hours extends through 6am the next day", () => {
    const now = dayjs.utc("2024-09-09T21:01:00-07:00").tz(place.timezone);
    const result = new Map();
    hourly(hourlyData, result, place.timezone);
    const hours = [...result.values()];
    const actual = sortAndFilterHours(hours, now)
          .map(hour => hour.time.tz(place.timezone).format());

    const expected = [
      "2024-09-09T22:00:00-07:00",
      "2024-09-09T23:00:00-07:00",
      "2024-09-10T00:00:00-07:00",
      "2024-09-10T01:00:00-07:00",
      "2024-09-10T02:00:00-07:00",
      "2024-09-10T03:00:00-07:00",
      "2024-09-10T04:00:00-07:00",
      "2024-09-10T05:00:00-07:00",
      "2024-09-10T06:00:00-07:00"
    ];

    expect(expected).to.eql(actual);
  });

  it("if the current local time is between midnight and 6am, the list of hours extends through 6am the next day", () => {
    const now = dayjs.utc("2024-09-10T03:00:00-07:00").tz(place.timezone);
    const result = new Map();
    hourly(hourlyData, result, place.timezone);
    const hours = [...result.values()];
    const actual = sortAndFilterHours(hours, now)
          .map(hour => hour.time.tz(place.timezone).format());

    const actualHourCount = actual.length;
    const actualFirstTimestamp = actual[0];
    const actualLastTimestamp = actual[actualHourCount - 1];
    
    const expectedHourCount = 27;
    const expectedFirstTimestamp = "2024-09-10T04:00:00-07:00";
    const expectedLastTimestamp = "2024-09-11T06:00:00-07:00";

    expect(expectedHourCount).to.equal(actualHourCount);
    expect(expectedFirstTimestamp).to.equal(actualFirstTimestamp);
    expect(expectedLastTimestamp).to.equal(actualLastTimestamp);
  });
});
