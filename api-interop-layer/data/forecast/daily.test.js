import { expect } from "chai";
import daily from "./daily.js";

describe("daily forecast", () => {
  // timezone is only used to calculate monthAndDay/dayName information and is
  // not important for this test suite
  // America/New_York is UTC-0400 for the dates used in the tests below.
  const timezone = "America/New_York";

  it("correctly handles a single night period moments before midnight", () => {
    // In this test, we have three weather day periods:
    //  11:59pm to 6am local time - this should be night, day 1
    //  6am to 6pm local time - this should be day, day 2
    //  6pm to 6am local time - this should be night, day 2
    const data = {
      properties: {
        periods: [
          {
            startTime: "2024-08-31T23:59:59-04:00",
            endTime: "2024-09-01T06:00:00-04:00",
            isDaytime: false,
          },
          {
            // This one is a day period
            startTime: "2024-09-01T06:00:00-04:00",
            endTime: "2024-09-01T18:00:00-04:00",
            isDaytime: true,
          },
          {
            // And this one is a night period
            startTime: "2024-09-01T18:00:00-04:00",
            endTime: "2024-09-02T06:00:00-04:00",
            isDaytime: false,
          },
        ],
      },
    };

    const { days } = daily(data, { timezone });
    expect(days.length).to.equal(2);

    const [firstDay, secondDay] = days;
    expect(firstDay.periods.length).to.equal(1);
    expect(secondDay.periods.length).to.equal(2);

    const [firstPeriod] = firstDay.periods;
    const [secondPeriod, thirdPeriod] = secondDay.periods;

    expect(firstPeriod.isDaytime).to.be.false;
    expect(firstPeriod.isOvernight).to.be.false;
    expect(firstPeriod.timeLabel).to.equal("6PM-6AM");
    expect(firstPeriod.dayName).to.equal("Tonight");

    expect(secondPeriod.isDaytime).to.be.true;
    expect(secondPeriod.isOvernight).to.be.false;
    expect(secondPeriod.dayName).to.equal("Sunday");

    expect(thirdPeriod.isDaytime).to.be.false;
    expect(thirdPeriod.isOvernight).to.be.false;
    expect(thirdPeriod.dayName).to.equal("Sunday");
  });

  it("handles an overnight period", () => {
    // In this test, we have three weather day periods:
    //  1am to 6am local time - this should be overnight
    //  6am to 6pm local time - this should be day
    //  6pm to 6am local time - this should be night
    const data = {
      properties: {
        periods: [
          {
            // A period is considered "overnight" if it begins after midnight
            // and ends at 6am (local times). The only day that can have an
            // overnight period is the first day, and if it has an overnight
            // period, then it must also have day and night periods.
            startTime: "2024-09-01T01:00:00-04:00",
            endTime: "2024-09-01T06:00:00-04:00",
            isDaytime: false,
          },
          {
            // This one is a day period
            startTime: "2024-09-01T06:00:00-04:00",
            endTime: "2024-09-01T18:00:00-04:00",
            isDaytime: true,
          },
          {
            // And this one is a night period
            startTime: "2024-09-01T18:00:00-04:00",
            endTime: "2024-09-02T06:00:00-04:00",
            isDaytime: false,
          },
        ],
      },
    };

    const { days } = daily(data, { timezone });
    expect(days.length).to.equal(1);

    const [firstDay] = days;
    expect(firstDay.periods.length).to.equal(3);

    const [firstPeriod, secondPeriod, thirdPeriod] = firstDay.periods;

    expect(firstPeriod.isDaytime).to.be.false;
    expect(firstPeriod.isOvernight).to.be.true;
    expect(firstPeriod.timeLabel).to.equal("NOW-6AM");
    expect(firstPeriod.dayName).to.equal("Today");

    expect(secondPeriod.isDaytime).to.be.true;
    expect(secondPeriod.isOvernight).to.be.false;
    expect(secondPeriod.timeLabel).to.equal("6AM-6PM");
    expect(secondPeriod.dayName).to.equal("Today");

    expect(thirdPeriod.isDaytime).to.be.false;
    expect(thirdPeriod.isOvernight).to.be.false;
    expect(thirdPeriod.timeLabel).to.equal("6PM-6AM");
    expect(thirdPeriod.dayName).to.equal("Today");
  });

  it("handles a day and night period", () => {
    // In this test, we have two weather day periods:
    //  12pm to 6pm local time - this should be day
    //  6pm to 6am local time - this should be night
    const data = {
      properties: {
        periods: [
          {
            startTime: "2024-09-01T12:00:00-04:00",
            endTime: "2024-09-01T18:00:00-04:00",
            isDaytime: true,
          },
          {
            startTime: "2024-09-01T18:00:00-04:00",
            endTime: "2024-09-02T06:00:00-04:00",
            isDaytime: false,
          },
        ],
      },
    };
    const { days } = daily(data, { timezone });
    expect(days.length).to.equal(1);

    const [firstDay] = days;
    expect(firstDay.periods.length).to.equal(2);

    const [firstPeriod, secondPeriod] = firstDay.periods;

    expect(firstPeriod.isDaytime).to.be.true;
    expect(firstPeriod.isOvernight).to.be.false;
    expect(firstPeriod.timeLabel).to.equal("6AM-6PM");
    expect(firstPeriod.dayName).to.equal("Today");

    expect(secondPeriod.isDaytime).to.be.false;
    expect(secondPeriod.isOvernight).to.be.false;
    expect(secondPeriod.timeLabel).to.equal("6PM-6AM");
    expect(secondPeriod.dayName).to.equal("Today");
  });

  it("handles only a night period", () => {
    // In this test, we have one weather day period:
    //  6pm to 6am local time - this should be night
    const data = {
      properties: {
        periods: [
          {
            startTime: "2024-09-01T18:00:00-04:00",
            endTime: "2024-09-02T06:00:00-04:00",
            isDaytime: false,
          },
        ],
      },
    };
    const { days } = daily(data, { timezone });
    expect(days.length).to.equal(1);

    const [firstDay] = days;
    expect(firstDay.periods.length).to.equal(1);

    const [firstPeriod] = firstDay.periods;

    expect(firstPeriod.isDaytime).to.be.false;
    expect(firstPeriod.isOvernight).to.be.false;
    expect(firstPeriod.timeLabel).to.equal("6PM-6AM");
    expect(firstPeriod.dayName).to.equal("Tonight");
  });

  it("breaks a day, night, and day period into two days", () => {
    // In this test, we have three weather day periods:
    //  6am to 6pm local time - this should be day
    //  6pm to 6am local time - this should be night
    //  6am to 6pm local time - this should be day for tomorrow

    const data = {
      properties: {
        periods: [
          {
            startTime: "2024-09-01T06:00:00-04:00",
            endTime: "2024-09-01T18:00:00-04:00",
            isDaytime: true,
          },
          {
            startTime: "2024-09-01T18:00:00-04:00",
            endTime: "2024-09-02T06:00:00-04:00",
            isDaytime: false,
          },
          {
            startTime: "2024-09-02T06:00:00-04:00",
            endTime: "2024-09-02T18:00:00-04:00",
            isDaytime: true,
          },
        ],
      },
    };
    const { days } = daily(data, { timezone });
    expect(days.length).to.equal(2);

    const [firstDay, secondDay] = days;
    expect(firstDay.periods.length).to.equal(2);
    expect(secondDay.periods.length).to.equal(1);

    const [firstPeriod, secondPeriod] = firstDay.periods;
    expect(firstPeriod.isDaytime).to.be.true;
    expect(firstPeriod.isOvernight).to.be.false;
    expect(firstPeriod.timeLabel).to.equal("6AM-6PM");
    expect(firstPeriod.dayName).to.equal("Today");

    expect(secondPeriod.isDaytime).to.be.false;
    expect(secondPeriod.isOvernight).to.be.false;
    expect(secondPeriod.timeLabel).to.equal("6PM-6AM");
    expect(secondPeriod.dayName).to.equal("Today");

    expect(secondDay.periods.length).to.equal(1);
    const [thirdPeriod] = secondDay.periods;
    expect(thirdPeriod.isDaytime).to.be.true;
    expect(thirdPeriod.isOvernight).to.be.false;
    expect(thirdPeriod.dayName).to.equal("Monday");
  });

  it("handles periods with positive UTC offsets", () => {
    // In this test, we have two weather day periods:
    //  12pm to 6pm EST local time - this should be day
    //  6pm to 6am EST local time - this should be night
    //
    // However, the times are represented in UTC+5 instead of UTC-5.
    const data = {
      properties: {
        periods: [
          {
            startTime: "2024-09-01T22:00:00+05:00",
            endTime: "2024-09-02T04:00:00+05:00",
            isDaytime: true,
          },
          {
            startTime: "2024-09-02T04:00:00+05:00",
            endTime: "2024-09-02T16:00:00+05:00",
            isDaytime: false,
          },
        ],
      },
    };
    const { days } = daily(data, { timezone });
    expect(days.length).to.equal(1);

    const [firstDay] = days;
    expect(firstDay.periods.length).to.equal(2);

    const [firstPeriod, secondPeriod] = firstDay.periods;

    expect(firstPeriod.isDaytime).to.be.true;
    expect(firstPeriod.isOvernight).to.be.false;
    expect(firstPeriod.timeLabel).to.equal("6AM-6PM");
    expect(firstPeriod.dayName).to.equal("Today");

    expect(secondPeriod.isDaytime).to.be.false;
    expect(secondPeriod.isOvernight).to.be.false;
    expect(secondPeriod.timeLabel).to.equal("6PM-6AM");
    expect(secondPeriod.dayName).to.equal("Today");
  });

  it("accepts periods with timezones of z", () => {
    const data = {
      properties: {
        periods: [
          {
            startTime: "2024-05-06T23:00:00Z",
            endTime: "2024-05-06T23:59:00Z",
            isDaytime: false,
          },
        ],
      },
    };
    const { days } = daily(data, { timezone });
    expect(days.length).to.equal(1);
    const [firstDay] = days;
    expect(firstDay.periods.length).to.equal(1);
    const [firstPeriod] = firstDay.periods;
    expect(firstPeriod.isDaytime).to.be.false;
    expect(firstPeriod.isOvernight).to.be.false;
    expect(firstPeriod.timeLabel).to.equal("6PM-6AM");
    expect(firstPeriod.dayName).to.equal("Tonight");
  });

  it("computes the correct day of the month (string) when UTC and local timezone refer to different days", () => {
    const data = {
      properties: {
        periods: [
          {
            // 3AM UTC  on Dec 3rd would be Dec 3
            // for UTC, but should be Dec 2 (8PM)
            // for America/New_York
            startTime: "2024-12-03T01:18:16Z",
            endTime: "2024-12-03T10:18:15Z",
            isDaytime: false,
            isOvernight: false
          },
        ],
      },
    };
    const { days } = daily(data, { timezone });
    const [firstDay] = days;
    const [period] = firstDay.periods;

    expect(firstDay.dayNumericString).to.equal("02");
    expect(period.dayName).to.equal("Tonight");
  });

  it("propagates an error", () => {
    const data = {
      error: true,
      properties: {
        periods: [
          {
            startTime: "2024-05-06T23:00:00+04:00",
            endTime: "2024-05-06T23:59:00+01:00",
            isDaytime: false,
          },
        ],
      },
    };
    const dailyData = daily(data, { timezone });
    expect(dailyData.error).to.be.true;
  });
});
