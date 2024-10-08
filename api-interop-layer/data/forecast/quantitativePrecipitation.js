import dayjs from "../../util/day.js";

export default (liquidData, iceData, snowData, { timezone }) => {
  const { uom: liquidUnits, values: liquidValues } = liquidData;
  const { uom: iceUnits, values: iceValues } = iceData;
  const { uom: snowUnits, values: snowValues } = snowData;

  return liquidValues.map(({ validTime, value }, index) => {
    const [isoTimestamp, isoDuration] = validTime.split("/");

    const liquid = { uom: liquidUnits, value };

    const ice = { uom: iceUnits, value: null };
    if (iceValues.length > index) {
      ice.value = iceValues[index].value;
    }

    const snow = { uom: snowUnits, value: null };
    if (snowValues.length > index) {
      snow.value = snowValues[index].value;
    }

    const start = dayjs(isoTimestamp);
    const duration = dayjs.duration(isoDuration);
    const end = start.add(duration);

    return {
      start,
      end,
      liquid,
      ice,
      snow,
      startHour: start.tz(timezone).format("h A"),
      endHour: end.tz(timezone).format("h A"),
    };
  });
};
