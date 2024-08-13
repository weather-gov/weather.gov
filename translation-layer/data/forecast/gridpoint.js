import dayjs from "dayjs";
import dayjsDuration from "dayjs/plugin/duration.js";
import dayjsUTC from "dayjs/plugin/utc.js";

dayjs.extend(dayjsDuration);
dayjs.extend(dayjsUTC);

export default (data, hours) => {
  const properties = Object.keys(data.properties).filter(
    (key) =>
      data.properties[key].uom && Array.isArray(data.properties[key].values),
  );

  for (const key of properties) {
    const { uom, values } = data.properties[key];

    for (const value of values) {
      const [isoTimestamp, isoDuration] = value.validTime.split("/");

      const start = dayjs(isoTimestamp);
      const duration = dayjs.duration(isoDuration).asHours();

      for (let offset = 0; offset < duration; offset += 1) {
        const time = start.add(offset, "hours").toISOString();
        const hourData = hours.get(time) ?? {};
        hourData.time = time;
        hourData[key] = { uom, value: value.value };

        hours.set(time, hourData);
      }
    }
  }

  return { geometry: data.geometry };
};
