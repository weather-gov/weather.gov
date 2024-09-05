import dayjs from "../../util/day.js";
import quantitativePrecipitation from "./quantitativePrecipitation.js";

export default (data, hours, place) => {
  // QPF is different from everything else. The value given to us is the total
  // predicted precipitation (liquid equivalent) over the duration, rather than
  // the precipitation for each hour in the duration. So pull it out, parse it
  // separately, and then remove it from the larger hourly dataset.
  const qpf = quantitativePrecipitation(
    data.properties.quantitativePrecipitation,
    place,
  );
  delete data.properties.quantitativePrecipitation;

  // For properties that have a unit of measure and a value, we want to parse
  // and add those to the hours map.
  const properties = Object.keys(data.properties).filter(
    (key) =>
      data.properties[key].uom && Array.isArray(data.properties[key].values),
  );

  for (const key of properties) {
    const { uom, values } = data.properties[key];

    for (const value of values) {
      // In order to parse the datetime string, we gotta split the duration off
      // first. We'll parse them separately.
      const [isoTimestamp, isoDuration] = value.validTime.split("/");
      const start = dayjs(isoTimestamp);
      const duration = dayjs.duration(isoDuration).asHours();

      // Starting from the first hour, we'll advance one hour at a time until we
      // have covered the full duration for this particular value. And we'll add
      // it to the hours map.
      for (let offset = 0; offset < duration; offset += 1) {
        const ts = start.add(offset, "hours").startOf("hour");
        const time = ts.toISOString();
        const hourData = hours.get(time) ?? {};

        // Internally, we'll preserve the Moment object so we don't have to
        // create it for comparison purposes elsewhere. Then add this value.
        hourData.time = ts;
        hourData[key] = { uom, value: value.value };

        // And save it back to the map.
        hours.set(time, hourData);
      }
    }
  }

  // The geometry isn't really related to the forecast (I mean, it super is, but
  // not in this context), but we get the grid's geometry from this API call.
  // We use it for filtering alerts and stuff, so send it back up.
  return { geometry: data.geometry, qpf };
};
