/** Align the passed in time to the start of its hour. */
export const sortAndFilterHours = (hours, earliest) => {
  return hours
    .sort(({ time: a }, { time: b }) => {
      if (a > b) {
        return 1;
      }
      if (a < b) {
        return -1;
      }
      return 0;
    })
    .filter(({ time }) => time >= earliest);
};
