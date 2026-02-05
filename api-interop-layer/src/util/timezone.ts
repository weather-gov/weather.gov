/* This file taken from a PR by @ikeyan:
   https://github.com/iamkun/dayjs/pull/2753 */

const MILLISECONDS_A_SECOND = 1000;
const MILLISECONDS_A_MINUTE = 1000 * 60;
const MIN = "minute";
const MS = "millisecond";

interface Dayjs {
    toDate(): Date;
    isValid(): boolean;
    utcOffset(): number;
    utcOffset(offset: number, keepLocalTime?: boolean): Dayjs;
    $set(unit: string, value: any): Dayjs;
    add(value: number, unit: string): Dayjs;
    format(fmt?: string): string;
    tz(timezone?: string, keepLocalTime?: boolean): Dayjs;
    $x: any;
    $L: string;
    $ms: number;
}
   
export default (o: any, c: any, d: any) => {
  let defaultTimezone: string;
  const proto = c.prototype;

  // Cache time-zone lookups from Intl.DateTimeFormat,
  // as it is a *very* slow method.
  const dtfCache: Record<string, Intl.DateTimeFormat> = { __proto: null } as any;
  const getDateTimeFormat = (timezone: string, timeZoneName?: string) => {
    const key = `${timezone}|${timeZoneName}`;
    let dtf = dtfCache[key];
    if (!dtf) {
      dtf = new Intl.DateTimeFormat("en-US", {
        // @ts-ignore
        hourCycle: "h23",
        timeZone: timezone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        timeZoneName: timeZoneName as any,
      });
      dtfCache[key] = dtf;
    }
    return dtf;
  };

  const makeFormatParts = (timestamp: number, timezone: string, timeZoneName?: string) => {
    const date = new Date(timestamp);
    const dtf = getDateTimeFormat(timezone, timeZoneName);
    const formatResult = dtf.formatToParts(date);
    return formatResult;
  };

  const tzOffset = (timestamp: number, timezone: string) => {
    const formatResult = makeFormatParts(timestamp, timezone);
    let Y;
    let M;
    let D;
    let h;
    let m;
    let s;
    formatResult.forEach((r) => {
      switch (r.type) {
        case "year":
          Y = r.value;
          break;
        case "month":
          M = parseInt(r.value) - 1;
          break;
        case "day":
          D = r.value;
          break;
        case "hour":
          h = r.value;
          break;
        case "minute":
          m = r.value;
          break;
        case "second":
          s = r.value;
          break;
        default:
          break;
      }
    });
    const utcTs = Date.UTC(Y as any, M as any, D as any, h as any, m as any, s as any);
    const asTS = timestamp;
    const over = asTS % MILLISECONDS_A_SECOND;
    return (utcTs - (asTS - over)) / MILLISECONDS_A_MINUTE;
  };

  const tzToFirstOffsetCache: Record<string, number> = { __proto__: null } as any;
  const initialValue = +d();
  const tzToFirstOffset = (timezone: string) => {
    let offset = tzToFirstOffsetCache[timezone];
    if (offset == null) {
      offset = tzOffset(initialValue, timezone);
      tzToFirstOffsetCache[timezone] = offset;
    }
    return offset;
  };

  // find the right offset a given local time. The o input is our guess, which determines which
  // offset we'll pick in ambiguous cases (e.g. there are two 3 AMs b/c Fallback DST)
  // https://github.com/moment/luxon/blob/master/src/datetime.js#L76
  const fixOffset = (localTS: number, tz: string) => {
    let o0 = tzToFirstOffset(tz);
    let utcGuess;
    let o2;
    // Our UTC time is just a guess because our offset is just a guess
    utcGuess = localTS - o0 * MILLISECONDS_A_MINUTE;
    // Test whether the zone matches the offset for this ts
    o2 = tzOffset(utcGuess, tz);
    // If so, offset didn't change and we're done
    if (o0 !== o2) {
      // If not, change the ts by the difference in the offset
      o0 = o2;
      utcGuess = localTS - o0 * MILLISECONDS_A_MINUTE;
      o2 = tzOffset(utcGuess, tz);
      // If that gives us the local time we want, we're done
      // If it's different, we're in a hole time.
      // The offset has changed, but the we don't adjust the time
      if (o0 > o2) {
        // swap o2 and o0
        utcGuess = o0;
        o0 = o2;
        o2 = utcGuess;
        utcGuess = localTS - o0 * MILLISECONDS_A_MINUTE;
      }
    }
    return d(utcGuess).utcOffset(o2);
  };

  proto.tz = function (this: Dayjs, timezone: string = defaultTimezone, keepLocalTime?: boolean) {
    const date = this.toDate();
    const target = this.isValid()
      ? new Date(getDateTimeFormat(timezone).format(date))
      : new Date(NaN);
    const diff = Math.round((date.getTime() - target.getTime()) / MILLISECONDS_A_MINUTE);
    // Because a bug at FF24, we're rounding the timezone offset around 15 minutes
    // https://github.com/moment/moment/pull/1871
    const offset = -Math.round(date.getTimezoneOffset() / 15) * 15 - diff;
    const isUTC = !offset;
    let ins;
    if (isUTC) {
      // if utcOffset is 0, turn it to UTC mode
      ins = this.utcOffset(0, keepLocalTime);
    } else {
      ins = d(target, { locale: this.$L })
        .$set(MS, this.$ms)
        .utcOffset(offset, true);
      if (keepLocalTime) {
        const oldOffset = this.utcOffset();
        const newOffset = ins.utcOffset();
        ins = ins.add(oldOffset - newOffset, MIN);
      }
    }
    ins.$x.$timezone = timezone;
    return ins;
  };

  proto.offsetName = function (this: Dayjs, type?: string) {
    // type: short(default) / long
    const zone = this.$x.$timezone || d.tz.guess();
    const result = makeFormatParts(+this.toDate(), zone, type || "short").find(
      (i) => i.type === "timeZoneName",
    )?.value;
    return result;
  };

  const oldStartOf = proto.startOf;
  proto.startOf = function (this: Dayjs, units: string, startOf: boolean) {
    if (!this.$x || !this.$x.$timezone) {
      return oldStartOf.call(this, units, startOf);
    }

    const withoutTz = d(this.format("YYYY-MM-DD HH:mm:ss:SSS"), {
      locale: this.$L,
    });
    const startOfWithoutTz = oldStartOf.call(withoutTz, units, startOf);
    return startOfWithoutTz.tz(this.$x.$timezone, true);
  };

  d.tz = function (input: any, arg1: any, arg2: any) {
    const timezone = arg2 || arg1 || defaultTimezone;
    if (typeof input !== "string") {
      // timestamp number || js Date || Day.js
      return d(input).tz(timezone);
    }
    const parseFormat = arg2 && arg1;
    const localTs = +d.utc(input, parseFormat);
    const ins = fixOffset(localTs, timezone);
    ins.$x.$timezone = timezone;
    return ins;
  };

  d.tz.guess = function () {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  };

  d.tz.setDefault = function (timezone: string) {
    defaultTimezone = timezone;
  };
};

declare module "dayjs" {
  interface Dayjs {
    tz(timezone?: string, keepLocalTime?: boolean): Dayjs;
  }
}
