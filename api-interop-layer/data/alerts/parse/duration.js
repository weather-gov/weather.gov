import dayjs from "../../../util/day.js";

export const parseDuration = (alert, timezone) => {
  const now = dayjs().tz(timezone);
  const tomorrow = now.add(1, "day").startOf("day");
  const later = tomorrow.add(1, "day");

  if (alert.onset.isSameOrBefore(now)) {
    // The event has already begun. Now we need to see if we know
    // when it ends.
    if (alert.finish) {
      const finish = alert.finish.tz(timezone);

      if (finish.isSameOrAfter(now)) {
        // We are currently in the middle of the event.
        if (finish.isBefore(tomorrow)) {
          // It ends today
          return `until ${finish.format("h:mm A")} today`;
        }
        // It ends after today
        return `until ${finish.format("dddd MM/DD h:mm A __")}`;
      }
      // The event has already concluded. We shouldn't be
      // showing this alert at all.
      return "has concluded";
    }
    // This alert has no ending or expiration time. This is a
    // weird scenario, but we should handle it just in case.
    return "is in effect";
  }

  // The event is in the future.
  const onsetHour = alert.onset.tz(timezone).get("hour");

  if (alert.onset.isBefore(tomorrow)) {
    // The event starts later today
    if (onsetHour < 12) {
      return "this morning";
    }
    if (onsetHour < 18) {
      return "this afternoon";
    }
    return "tonight";
  }
  if (alert.onset.isBefore(later)) {
    // The event starts tomorrow
    if (onsetHour < 12) {
      return "tomorrow morning";
    }
    if (onsetHour < 18) {
      return "tomorrow afternoon";
    }
    return "tomorrow night";
  }

  // The alert starts in the further future
  return alert.onset.tz(timezone).format("dddd");
};

export default { parseDuration };
