import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

let play = "testing";
let now = null;
let nowMethod = null;

const timestampFromEnv = () => {
  if (process.env.WX_NOW_TIMESTAMP) {
    const parsed = dayjs.utc(process.env.WX_NOW_TIMESTAMP);
    if (parsed) {
      return parsed;
    }
  }

  return false;
};

const getNow = () => {
  // If we are able to parse out a timestamp
  // from the environment variable, use that
  const fromEnv = timestampFromEnv();
  if (fromEnv) {
    nowMethod = "env";
    return fromEnv;
  }

  // Otherwise, if there is a cached
  // now value, use that
  if (now) {
    nowMethod = "node";
    return dayjs.utc(now);
  }

  // And ultimately, we just
  // return the actual now
  nowMethod = null;
  return dayjs();
};

export default {
  get play() {
    return play;
  },
  set play(v) {
    play = v;
  },

  get now() {
    return getNow();
  },
  set now(isoString) {
    now = isoString;
  },
  get nowMethod() {
    return nowMethod;
  },
};
