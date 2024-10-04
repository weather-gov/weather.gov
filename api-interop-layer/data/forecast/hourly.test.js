import { expect } from "chai";
import dayjs from "../../util/day.js";
import hourly, {
  sortAndFilterHours,
  filterHoursForCurrentDay,
  filterHoursForDay
} from "./hourly.js";

const place = {
  timezone: "America/Los_Angeles"
};

/**
 * Generate the hourly test data we will use.
 * We will create four full days of hourly data
 * starting at 7 minutes past each hour.
 */
const startTime = dayjs.utc("2024-09-09T05:07:00-07:00").tz("America/Los_Angeles");
const endTime = dayjs.utc("2024-09-14T03:07:00-07:00").tz("America/Los_Angeles");
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
    hourly(hourlyData, result, place);
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
    hourly(hourlyData, result, place);
    const actual = [...result.values()]
          .map(val => val.time.tz(place.timezone).format())
          .slice(0,5);

    expect(expected).to.eql(actual);
  });

  it("the first hour begins at the start of the current whole hour", () => {
    const now = dayjs.utc("2024-09-09T09:15:00-07:00").tz(place.timezone);
    const result = new Map();
    hourly(hourlyData, result, place);
    let hours = [...result.values()];
    hours = sortAndFilterHours(hours, now);
    const actual = filterHoursForCurrentDay(hours, now)
          .map(hour => hour.time.tz(place.timezone).format())
          .slice(0,5);

    const expected = [
      "2024-09-09T09:00:00-07:00",
      "2024-09-09T10:00:00-07:00",
      "2024-09-09T11:00:00-07:00",
      "2024-09-09T12:00:00-07:00",
      "2024-09-09T13:00:00-07:00",
    ];

    expect(expected).to.eql(actual);
  });

  describe("if the current local time is before midnight, the list of hours extends through 6am the next day", () => {
    let filteredHours;
    before(() => {
      const now = dayjs.utc("2024-09-09T21:01:00-07:00").tz(place.timezone);
      const result = new Map();
      hourly(hourlyData, result, place);
      let hours = [...result.values()];
      hours = sortAndFilterHours(hours, now);
      filteredHours = filterHoursForCurrentDay(hours, now);
    });

    it("with the correct timestamps", () => {
      const actual = filteredHours
            .map(hour => hour.time.tz(place.timezone).format());

      const expected = [
        "2024-09-09T21:00:00-07:00",
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

    it("with the correct hour labels", () => {
      const actual = filteredHours
            .map(hour => hour.hour);

      const expected = [
        "9 PM",
        "10 PM",
        "11 PM",
        "12 AM",
        "1 AM",
        "2 AM",
        "3 AM",
        "4 AM",
        "5 AM",
        "6 AM"
      ];

      expect(expected).to.eql(actual);
    });
  });

  describe("if the current local time is between midnight and 6am, the list of hours extends through 6am the next day", () => {
    let filteredHours;
    before(() => {
      const now = dayjs.utc("2024-09-10T03:00:00-07:00").tz(place.timezone);
      const result = new Map();
      hourly(hourlyData, result, place);
      let hours = [...result.values()];
      hours = sortAndFilterHours(hours, now);
      filteredHours = filterHoursForCurrentDay(hours, now);
    });

    it("with the correct timestamps", () => {
      const actual = filteredHours
            .map(hour => hour.time.tz(place.timezone).format());

      const actualHourCount = actual.length;
      const actualFirstTimestamp = actual[0];
      const actualLastTimestamp = actual[actualHourCount - 1];
      
      const expectedHourCount = 28;
      const expectedFirstTimestamp = "2024-09-10T03:00:00-07:00";
      const expectedLastTimestamp = "2024-09-11T06:00:00-07:00";

      expect(expectedHourCount).to.equal(actualHourCount);
      expect(expectedFirstTimestamp).to.equal(actualFirstTimestamp);
      expect(expectedLastTimestamp).to.equal(actualLastTimestamp);
    });

    it("with the correct hour labels", () => {
      const actual = filteredHours
            .map(hour => hour.hour);

      const expectedFirstLabel = "3 AM";
      const expectedLastLabel = "6 AM";

      expect(expectedFirstLabel).to.equal(actual[0]);
      expect(expectedLastLabel).to.equal(actual[actual.length-1]);
    });
  });

  describe("future days are 6am to 6am (next day)", () => {
    let filteredHours;
    before(() => {
      const dayStart = dayjs.utc("2024-09-12T06:00:00-07:00").tz(place.timezone);
      const result = new Map();
      hourly(hourlyData, result, place);
      let hours = [...result.values()];
      hours = sortAndFilterHours(hours, dayStart);
      filteredHours = filterHoursForDay(hours, dayStart);
    });

    it("with the correct timestamps", () => {
      const actual = filteredHours
            .map(hour => hour.time.tz(place.timezone).format());

      const expectedStart = "2024-09-12T06:00:00-07:00";
      const expectedEnd = "2024-09-13T06:00:00-07:00";

      expect(expectedStart).to.equal(actual[0]);
      expect(expectedEnd).to.equal(actual[actual.length-1]);
    });

    it("with the correct hour labels", () => {
      const actual = filteredHours
            .map(hour => hour.hour);

      const expectedStartLabel = "6 AM";
      const expectedEndLabel = "6 AM";

      expect(expectedStartLabel).to.equal(actual[0]);
      expect(expectedEndLabel).to.equal(actual[actual.length-1]);
    });
  });

  describe("if there aren't enough hours for the future day, do just up to what's available", () => {
    let filteredHours;
    before(() => {
      const dayStart = dayjs.utc("2024-09-13T06:00:00-07:00").tz(place.timezone);
      const result = new Map();
      hourly(hourlyData, result, place);
      let hours = [...result.values()];
      hours = sortAndFilterHours(hours, dayStart);
      filteredHours = filterHoursForDay(hours, dayStart);
    });

    it("with the correct timestamps", () => {
      const actual = filteredHours.map(hour => hour.time.tz(place.timezone).format());

      const expectedStart = "2024-09-13T06:00:00-07:00";
      const expectedEnd = "2024-09-14T02:00:00-07:00";

      expect(expectedStart).to.equal(actual[0]);
      expect(expectedEnd).to.equal(actual[actual.length-1]);
    });

    it("with the correct hour labels", () => {
      const actual = filteredHours.map(hour => hour.hour);

      const expectedStartLabel = "6 AM";
      const expectedEndLabel = "2 AM";

      expect(expectedStartLabel).to.equal(actual[0]);
      expect(expectedEndLabel).to.equal(actual[actual.length-1]);
    });
  });
});
