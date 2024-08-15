import dayjs from "../../util/day.js";

export default (alertA, alertB) => {
  const now = dayjs();

  const priorityA = alertA.metadata.priority;
  const priorityB = alertB.metadata.priority;

  // If both alerts are currently active, sort them by priority.
  if (alertA.onset.isBefore(now) && alertB.onset.isBefore(now)) {
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

  // Otherwise, they start at the same time in the future. Back to sorting by
  // priority!
  return priorityA - priorityB;
};
