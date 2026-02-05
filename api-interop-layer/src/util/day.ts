import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat.js";
import duration from "dayjs/plugin/duration.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
// Rather than importing the built-in timezone plugin from day.js,
// we import a custom implementation. This fixes a substantial
// performance bug. Fix originally propsed by @ikeyan on GitHub:
//   https://github.com/iamkun/dayjs/pull/2753
import tz from "./dayjs.timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(advancedFormat);
dayjs.extend(duration);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(tz);
dayjs.extend(utc);

export default dayjs;
