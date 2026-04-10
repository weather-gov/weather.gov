/** @file Some handy functions for use in selecting page elements by content. */

const WEEKDAY = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Get tomorrow's English day name. */
export const tomorrow = () => {
  return WEEKDAY[(new Date().getDay() + 1) % 7];
};

/** Get the day after tomorrow's English day name. */
export const overmorrow = () => {
  return WEEKDAY[(new Date().getDay() + 1) % 7];
};

/** Get yesterday's English day name. */
export const seventh = () => {
  return WEEKDAY[(new Date().getDay() + 6) % 7];
};
