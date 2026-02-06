import { sentenceCase } from "../../util/case.js";
import { convertProperties } from "../../util/convert.js";
import dayjs from "../../util/day.js";
import { parseAPIIcon } from "../../util/icon.js";

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

  const now = new Date();

  // So, we iterate over all day periods and bundle up them into days.
  for (const period of data.properties.periods) {
    const start = new Date(period.startTime);
    const end = new Date(period.endTime);

    if (end < now) {
      continue;
    }

    // If this is the first, obviously put it in the list.
    if (days.length === 0) {
      days.push({
        start,
        periods: [],
      });
    }
    // The only other times we will add new days to the list is
    // if we find a daytime period. But not necessarily!
    else if (period.isDaytime) {
      // If there are already 2 or more days in the list, then
      // a new daytime period is always the start of a new day.
      //
      // If there is only one day but it already has 2 or more
      // periods, then this daytime period is also the start
      // of a new day.
      if (days.length > 1 || days[0].periods.length > 1) {
        days.push({ start, periods: [] });
      }
      // If there is only one day and it only has one period,
      // then this daytime period could either be the start of
      // a new day OR it could be the daytime period of a day
      // with overnight, day, and night periods.
      else {
        // To figure it out, we need to see what time the
        // existing day period starts. If if starts after 6am
        // local time, then the existing day already has a
        // day period *OR* the existing day only has a night
        // period. In either case, this daytime period is
        // the start of a new day period.
        //
        // If the last period of the existing day starts
        // before 6am, then it must be an overnight period.
        // If it was a night period, then its start time
        // would be 6pm the previous day, but we're only
        // looking at the hours, not the dates. :)
        const latestStartHour = dayjs(days[0].periods[0].start)
          .tz(timezone)
          .hour();

        if (latestStartHour >= 6) {
          days.push({ start, periods: [] });
        }
      }
    }

    const dayPeriod = days[days.length - 1];
    if (days.length > 0) {
      dayPeriod.end = end;
    }

    const periodData = {
      start: period.startTime,
      end: period.endTime,
      isDaytime: period.isDaytime,
      isOvernight: false,
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

    dayPeriod.periods.push(periodData);
  }

  if (days.length > 0) {
    // The first day could have an overnight period, so we need to check for
    // that. The first period of the day is an overnight period IFF there are
    // three periods in total.
    const [today] = days;
    if (today.periods.length === 3) {
      today.periods[0].isOvernight = true;
    }
  }

  return {
    ...convertProperties({ elevation: data.properties.elevation }),
    generated: data.properties.generatedAt,
    updated: data.properties.updateTime,
    valid: data.properties.validTimes,
    days: days.filter(({ periods }) => periods.length > 0),
  };
};
