import dayjs from "../../util/day.js";

export const getMarineDays = async (hours: any, timezone: any) => {
  // If the first hour in the gridpoint forecast is before 6am, then the first
  // "day" in the forecast is techncially "yesterday." I don't think that
  // should happen but shrugging-person-made-of-symbols.
  const firstDay = await new Promise((resolve) =>
    resolve(dayjs.utc((Array.from(hours.keys()) as any[])[0]).tz(timezone)),
  )
    .then(async (day: any) => {
      if (day.get("hour") < 6) {
        return day.subtract(1, "day");
      }
      return day;
    })
    .then(async (day: any) =>
      // Forecast days begin at 6am, so set the start time for the day accordingly
      day
        .set("hour", 6)
        .set("minute", 0)
        .set("second", 0)
        .set("millisecond", 0),
    );

  const lastDay = await new Promise((resolve) =>
    resolve(dayjs.utc((Array.from(hours.keys()) as any[]).pop()).tz(timezone)),
  )
    .then((day: any) => {
      // If the last hour is after 6am, then we have another full day in the
      // forecast, even if we don't have a full day's data.
      if (day.get("hour") > 6) {
        return day.add(1, "day");
      }
      return day;
    })
    .then((day) =>
      day
        .set("hour", 6)
        .set("minute", 0)
        .set("second", 0)
        .set("millisecond", 0),
    );

  return [...Array(dayjs.duration(lastDay.diff(firstDay)).asDays())].map((_, day: any) => {
      const start = firstDay.add(day, "day");

      return {
        start: start.toISOString(),
        end: start.add(1, "day").toISOString(),
        monthNumericString: start.format("MM"),
        dayNumericString: start.format("DD"),
        periods: [],
      };
    },
  );
};
