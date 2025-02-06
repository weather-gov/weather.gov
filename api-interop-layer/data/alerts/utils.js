import dayjs from "../../util/day.js";

/**
 * Given an alert object, parse the relevant timestamp fields
 * into dayjs objects that are aligned to the provided timezone.
 * Modifies the given alert object in place
 */
export const modifyTimestampsForAlert = (alert, timezone) => {
  // A regex we will use for double-checking that the value
  // is likely to be a timestamp.
  // The day.js parser looks for ANY ISO-8601 valid text in the string
  // and attempts to convert it. As a result, some harmless text ends
  // up getting picked up as valid dates. For example:
  //
  // PLEASE CALL 5-1-1
  //
  // day.js parses that to May 1, 2001. That is obviously not correct.
  // But we know all of our timestamps are *only* ISO8601 strings with
  // full date information, so we can check that the string starts with
  // a YYYY-MM-DD format as well as parsing to a valid day.js object.
  const rx = /^\d{4}-\d{2}-\d{2}/;

  // Start with properties.
  // Alerts pulled out from the database will not have properties,
  // so be sure to check first
  if(alert.properties){
    Object.keys(alert.properties).forEach(key => {
      const value = alert.properties[key];
      const date = dayjs(value);

      if(date.isValid() && rx.test(value)){
        alert.properties[key] = date.tz(timezone);
      }
    });
  }

  // Now do the top level
  Object.keys(alert).forEach(key => {
    const value = alert[key];
    const date = dayjs(value);

    if(date.isValid() && rx.test(value)){
      alert[key] = date.tz(timezone);
    }
  });
};

/**
 * Maps the alerts into the daily forecast.
 * This also aligns alerts with the hour periods
 * for each given day.
 * NOTE: We modify the day objects in place
 */
export const alignAlertsToDaily = (alerts, days) => {
  for (const day of days.filter(
      ({ hours }) => hours.length > 0,
  )) {
    day.alerts = { metadata: { count: 0, highest: "other" }, items: [] };

    const start = day.hours[0].time;
    const end = day.hours[day.hours.length - 1].time;

    // Filter down to just the alerts that are or will be active during this
    // particular day.
    const dayAlerts = alerts.items.filter(
      ({ onset, finish }) =>
      onset.isSameOrBefore(end) && finish.isSameOrAfter(start),
    );

    dayAlerts.forEach((alert) => {
      // How deep into the hourly forecast does this alert appear? This is based
      // on the hourly part of the forecast day, not the entire forecast day,
      // because the hourly part begins at the top of the next hour. This is
      // essentially which hour the alert begins on.
      const offset = Math.max(
        0,
        Math.floor(dayjs.duration(alert.onset.diff(start)).asHours()),
      );

      // How long will the alert last AFTER the start of the first hour of the
      // hourly forecast?
      const absoluteDuration = Math.ceil(
        dayjs
          .duration(alert.finish.diff(start.add(offset, "hours")))
          .asHours(),
      );

      // Cap the alert duration at the remaining hours in the forecast.
      const duration = Math.min(absoluteDuration, day.hours.length - offset);

      // Save the alert.
      day.alerts.items.push({
        id: alert.id,
        event: alert.event,
        level: alert.metadata.level.text,
        offset,
        duration,
        // The number of hours remaining in the forecast when this alert ends.
        remainder: day.hours.length - offset - duration,
      });
    });

    // Get the number of alerts and the "level" of the most significant alert
    // and pull those up to the top level.
    day.alerts.metadata.count = day.alerts.items.length;
    day.alerts.metadata.highest = dayAlerts
      .map(({ metadata: { level } }) => level)
      .sort((a, b) => {
        const priorityA = a.priority;
        const priorityB = b.priority;

        return priorityB - priorityA;
      })
      .pop()?.text;
  }
};

export default alignAlertsToDaily;
