import dayjs from "../../util/day.js";

export default (data, { timezone }) => {
  const { uom, values } = data;

  return values.map(({ validTime, value }) => {
    const [isoTimestamp, isoDuration] = validTime.split("/");

    const start = dayjs(isoTimestamp);
    const duration = dayjs.duration(isoDuration);
    const end = start.add(duration);

    return {
      start,
      end,
      uom,
      value,
      startHour: start.tz(timezone).format("h A"),
      endHour: end.tz(timezone).format("h A"),
    };
  });
};
