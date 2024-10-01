import sinon from "sinon";
import dayjs from "dayjs";
import { expect } from "chai";
import daily from "./daily.js";
import fs from "fs";
import path from "path";

describe("daily forecast", () => {

  // timezone is only used to calculate monthAndDay/dayName information
  const timezone = "America/New_York";

  it("returns one overnight period when between midnight and 6am", () => {
    const data = {
      properties: {
        periods: [{
          startTime: "2024-09-01T01:00:00-10:00",
          endTime: "2024-09-01T04:00:00-10:00",
          isDaytime: false,
        }],
      },
    };
    const dailyData = daily(data, { timezone });
    const [ firstDay ] = dailyData.days;
    expect(firstDay.periods.length).to.equal(1);
    const [ firstPeriod ] = firstDay.periods;
    expect(firstPeriod.isDaytime).not.to.be.true;
    expect(firstPeriod.isOvernight).to.be.true;
    expect(firstPeriod.timeLabel).to.equal("NOW-6AM");
    expect(firstPeriod.dayName).to.equal("Today");
  });

  it("returns one overnight period when between midnight and 6am, even with data before midnight", () => {
    const data = {
      properties: {
        periods: [{
          startTime: "2024-08-31T11:00:00-10:00",
          endTime: "2024-09-01T01:00:00-10:00",
          isDaytime: false,
        }],
      },
    };
    const dailyData = daily(data, { timezone });
    const [ firstDay ] = dailyData.days;
    expect(firstDay.periods.length).to.equal(1);
    const [ firstPeriod ] = firstDay.periods;
    expect(firstPeriod.isDaytime).not.to.be.true;
    expect(firstPeriod.isOvernight).to.be.true;
    expect(firstPeriod.timeLabel).to.equal("NOW-6AM");
    expect(firstPeriod.dayName).to.equal("Today");
  });

  it("returns one tonight period when between 6pm and midnight", () => {
    const data = {
      properties: {
        periods: [{
          startTime: "2024-05-06T23:00:00-05:00",
          endTime: "2024-05-06T23:59:00-0500",
          isDaytime: false,
        }],
      },
    };
    const dailyData = daily(data, { timezone });
    const [ firstDay ] = dailyData.days;
    expect(firstDay.periods.length).to.equal(1);
    const [ firstPeriod ] = firstDay.periods;
        console.log(JSON.stringify(firstPeriod));

    expect(firstPeriod.isDaytime).not.to.be.true;
    expect(firstPeriod.isOvernight).not.to.be.true;
    expect(firstPeriod.timeLabel).to.equal("6PM-6AM");
    expect(firstPeriod.dayName).to.equal("Today");
  });

  it("returns no overnight period when between 6am and midnight", () => {
    // TODO
  });

  it("returns three periods when between midnight and 6am", () => {
    // TODO
  });
});
