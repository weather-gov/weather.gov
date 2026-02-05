import dayjs from "../../util/day.js";

export default (alertA, alertB) => {
  const now = dayjs();

  const priorityA = alertA.metadata.priority;
  const priorityB = alertB.metadata.priority;

  // If both alerts are currently active...
  if (alertA.onset.isBefore(now) && alertB.onset.isBefore(now)) {
    // ...and they have the same priority, sort them by when they finish.
    if (priorityA === priorityB) {
      if (alertA.finish.isBefore(alertB.finish)) {
        return -1;
      }
      if (alertB.finish.isBefore(alertA.finish)) {
        return 1;
      }
      return 0;
    }

    // ...or else sort them by priority.
    return priorityA - priorityB;
  }

  // If we're here, both alerts start in the future. If they start at different
  // times, sort them by onset.
  if (alertA.onset.isBefore(alertB.onset)) {
    return -1;
  }
  if (alertB.onset.isBefore(alertA.onset)) {
    return 1;
  }

  // Otherwise, they start at the same time in the future. If they have the same
  // priority, sort them by ending time.
  if (priorityA === priorityB) {
    if (alertA.finish.isBefore(alertB.finish)) {
      return -1;
    }
    if (alertB.finish.isBefore(alertA.finish)) {
      return 1;
    }
    return 0;
  }

  // Otherwise, sort them by priority.
  return priorityA - priorityB;
};
