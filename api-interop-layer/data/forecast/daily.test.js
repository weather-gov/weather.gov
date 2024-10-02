import { expect } from "chai";
import daily from "./daily.js";

describe("daily forecast", () => {

  // timezone is only used to calculate monthAndDay/dayName information and is
  // not important for this test suite
  const timezone = "America/New_York";

  it("returns one day when given one overnight period", () => {
    const data = {
      properties: {
        periods: [{
          startTime: "2024-09-01T01:00:00-10:00",
          endTime: "2024-09-01T04:00:00-10:00",
          isDaytime: false,
        }],
      },
    };
    const { days } = daily(data, { timezone });
    expect(days.length).to.equal(1);
    const [ firstDay ] = days;
    expect(firstDay.periods.length).to.equal(1);
    const [ firstPeriod ] = firstDay.periods;
    expect(firstPeriod.isDaytime).not.to.be.true;
    expect(firstPeriod.isOvernight).to.be.true;
    expect(firstPeriod.timeLabel).to.equal("NOW-6AM");
    expect(firstPeriod.dayName).to.equal("Today");
  });

  it("returns one day when given two periods", () => {
    const data = {
      properties: {
        periods: [{
          startTime: "2024-09-01T01:00:00-10:00",
          endTime: "2024-09-01T02:00:00-10:00",
          isDaytime: true,
        },
        {
          startTime: "2024-09-01T13:00:00-10:00",
          endTime: "2024-09-01T15:00:00-10:00",
          isDaytime: false,
        }],
      },
    };
    const { days } = daily(data, { timezone });
    expect(days.length).to.equal(1);
    const [ firstDay ] = days;
    expect(firstDay.periods.length).to.equal(2);
    const [ firstPeriod, secondPeriod ] = firstDay.periods;
    expect(firstPeriod.isDaytime).to.be.true;
    expect(firstPeriod.isOvernight).not.to.be.true;
    expect(firstPeriod.timeLabel).to.equal("6AM-6PM");
    expect(firstPeriod.dayName).to.equal("Today");
    expect(secondPeriod.isDaytime).not.to.be.true;
    expect(secondPeriod.isOvernight).not.to.be.true;
    expect(secondPeriod.timeLabel).to.equal("6PM-6AM");
    expect(secondPeriod.dayName).to.equal("Today");
  });

  it("returns two days when given three periods", () => {
    const data = {
      properties: {
        periods: [{
          startTime: "2024-09-01T01:00:00-10:00",
          endTime: "2024-09-01T02:00:00-10:00",
          isDaytime: true,
        },
        {
          startTime: "2024-09-01T13:00:00-10:00",
          endTime: "2024-09-01T15:00:00-10:00",
          isDaytime: false,
        },
        {
          startTime: "2024-09-02T00:00:00-10:00",
          endTime: "2024-09-02T06:00:00-10:00",
          isDaytime: true,
        }],
      },
    };
    const { days } = daily(data, { timezone });
    expect(days.length).to.equal(2);
    const [ firstDay, secondDay ] = days;
    expect(firstDay.periods.length).to.equal(2);
    const [ firstPeriod, secondPeriod ] = firstDay.periods;
    expect(firstPeriod.isDaytime).to.be.true;
    expect(firstPeriod.isOvernight).not.to.be.true;
    expect(firstPeriod.timeLabel).to.equal("6AM-6PM");
    expect(firstPeriod.dayName).to.equal("Today");
    expect(secondPeriod.isDaytime).not.to.be.true;
    expect(secondPeriod.isOvernight).not.to.be.true;
    expect(secondPeriod.timeLabel).to.equal("6PM-6AM");
    expect(secondPeriod.dayName).to.equal("Today");
    expect(secondDay.periods.length).to.equal(1);
  });

  it("accepts periods with timezones of z", () => {
    const data = {
      properties: {
        periods: [{
          startTime: "2024-05-06T23:00:00Z",
          endTime: "2024-05-06T23:59:00Z",
          isDaytime: false,
        }],
      },
    };
    const { days } = daily(data, { timezone });
    expect(days.length).to.equal(1);
    const [ firstDay ] = days;
    expect(firstDay.periods.length).to.equal(1);
    const [ firstPeriod ] = firstDay.periods;
    expect(firstPeriod.isDaytime).not.to.be.true;
    expect(firstPeriod.isOvernight).to.be.true;
    expect(firstPeriod.timeLabel).to.equal("NOW-6AM");
    expect(firstPeriod.dayName).to.equal("Today");
  });

  it("propagates an error", () => {
    const data = {
      error: true,
      properties: {
        periods: [{
          startTime: "2024-05-06T23:00:00+04:00",
          endTime: "2024-05-06T23:59:00+01:00",
          isDaytime: false,
        }],
      },
    };
    const dailyData = daily(data, { timezone });
    expect(dailyData.error).to.be.true;
  });
});
