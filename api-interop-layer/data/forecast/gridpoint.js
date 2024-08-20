import dayjs from "../../util/day.js";

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
        const ts = start.add(offset, "hours").startOf("hour");
        const time = ts.toISOString();
        const hourData = hours.get(time) ?? {};
        hourData.time = ts;
        hourData[key] = { uom, value: value.value };

        hours.set(time, hourData);
      }
    }
  }

  return { geometry: data.geometry };
};
