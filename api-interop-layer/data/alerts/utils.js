import dayjs from "../../util/day.js";

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
