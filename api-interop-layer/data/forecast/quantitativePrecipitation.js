import dayjs from "../../util/day.js";

export default (data, { timezone }) => {
  const { uom, values } = data;

  const qpf = [];

  for (const { validTime, value } of values) {
    const [isoTimestamp, isoDuration] = validTime.split("/");

    const start = dayjs(isoTimestamp);
    const duration = dayjs.duration(isoDuration);
    const end = start.add(duration);

    qpf.push({
      start,
      end,
      uom,
      value,
      startHour: start.tz(timezone).format("h A"),
      endHour: end.tz(timezone).format("h A"),
    });
  }

  return qpf;
};
