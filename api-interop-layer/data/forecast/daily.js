import dayjs from "../../util/day.js";
import { convertProperties } from "../../util/convert.js";
import { parseAPIIcon } from "../../util/icon.js";
import { sentenceCase } from "../../util/case.js";

export default (data, { timezone }) => {
  if (data.error) {
    return { error: true };
  }
  // The API returns a list of day periods. Every calendar day is represented by
  // one, two, or three day periods. They’re 12 hours each from 6am to 6pm and
  // from 6pm to 6am. The API includes an isDaytime property so we know which
  // one is for the day and night. The *FIRST* calendar day ("today") can have
  // three periods, the first of which is "overnight." (between midnight and
  // 6am; this is technically the night period from the previous weather day).
  // The first weather day can also have just a single night time period between
  // 6pm and midnight.

  // This is the list of all weather days that have been processed. As we
  // iterate over the total list of weather day periods from the input, we will
  // populate this list.
  const days = [];
  let previousDay = -1;

  // So, we iterate over all day periods and bundle up them into days.
  for (const period of data.properties.periods) {
    const start = dayjs(period.startTime).tz(timezone);

    if (start.get("day") !== previousDay) {
      if (days.length > 0) {
        days[days.length - 1].end = period.startTime;
      }

      days.push({ start: period.startTime, periods: [] });
      previousDay = start.get("day");
    }

    const dayPeriod = days[days.length - 1];
    if (days.length > 0) {
      days[days.length - 1].end = period.endTime;
    }

    const periodData = {
      start: dayjs(period.startTime),
      end: dayjs(period.endTime),
      isDaytime: period.isDaytime,
      isOvernight: false,
      monthAndDay: start.tz(timezone).format("MMM D"),
      dayName: days.length === 1 ? "Today" : start.tz(timezone).format("dddd"),
      data: convertProperties({
        icon: parseAPIIcon(period.icon),
        description: sentenceCase(period.shortForecast),
        temperature: {
          unitCode: "wmoUnit:degF",
          value: period.temperature,
        },
        probabilityOfPrecipitation: period.probabilityOfPrecipitation,
        windSpeed: {
          unitCode: "wxgov:mph",
          value: Number.parseInt(period.windSpeed, 10),
        },
        windDirection: period.windDirection,
      }),
    };

    // Add time labels to the first day
    if (days.length === 1) {
      if (periodData.isDaytime) {
        periodData.timeLabel = "6AM-6PM";
      } else {
        periodData.timeLabel = "6PM-6AM";
      }
    }

    dayPeriod.periods.push(periodData);
  }

  if (days.length > 0) {
    // The first day could have an overnight period, so we need to check for
    // that. The first period of the day is an overnight period IFF there are
    // three periods in total.
    const [today] = days;
    if (today.periods.length === 3) {
      today.periods[0].isOvernight = true;
      today.periods[0].timeLabel = "NOW-6AM";
    }
  }

  days.forEach((day) => {
    day.start = dayjs(day.start);
    day.end = dayjs(day.end);
  });

  return {
    ...convertProperties({ elevation: data.properties.elevation }),
    generated: data.properties.generatedAt,
    updated: data.properties.updateTime,
    valid: data.properties.validTimes,
    days: days.filter(({ periods }) => periods.length > 0),
  };
};
