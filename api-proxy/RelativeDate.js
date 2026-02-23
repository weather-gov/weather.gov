export default class RelativeDate {
  #staticReturn;

  #from;
  #adjustMethod;
  #fromMethod;
  #adjustValue;

  #hour;
  #minute;
  #offset;
  #adjustment;

  #isoDuration;

  constructor(relativeTimeString) {
    this.#staticReturn = relativeTimeString;

    if (/^date:\S+/.test(relativeTimeString)) {
      const [, start, modifier] =
        relativeTimeString.match(/^date:(\S+)\s?(.*)/);
      this.#from = start;

      const [, duration] = relativeTimeString.split(" / ");
      if (duration) {
        this.#isoDuration = duration;
      }

      if (start === "today") {
        const [, hour, minute, offset, adjustment] = modifier.match(
          /^(\d{2}):(\d{2}):([-+]?\d{1,2})(.*)/,
        );
        this.#hour = +hour;
        this.#minute = +minute;
        this.#offset = Number.parseInt(offset, 10);
        this.#adjustment = adjustment;
      } else if (start.startsWith("now")) {
        this.#adjustment = modifier;
      }

      if (this.#adjustment) {
        const [amount, unit] = this.#adjustment.trim().split(" ");
        if (amount && unit) {
          if (/^d(ay)?s?/i.test(unit)) {
            this.#adjustMethod = "setUTCDate";
            this.#fromMethod = "getUTCDate";
          } else if (/^h(our)?s?/i.test(unit)) {
            this.#adjustMethod = "setUTCHours";
            this.#fromMethod = "getUTCHours";
          } else if (/^m(inute)?s?/i.test(unit)) {
            this.#adjustMethod = "setUTCMinutes";
            this.#fromMethod = "getUTCMinutes";
          } else if (/^s(econd)?s?/i.test(unit)) {
            this.#adjustMethod = "setUTCSeconds";
            this.#fromMethod = "getUTCSeconds";
          }
          this.#adjustValue = Number.parseInt(amount);
        }
      }
    }
  }

  #adjustTime(time) {
    if (this.#adjustMethod && this.#fromMethod && this.#adjustValue) {
      time[this.#adjustMethod](time[this.#fromMethod]() + this.#adjustValue);
    }
    switch (this.#from) {
      case "now:hour":
        time.setMinutes(0);
      case "now:minutes":
        time.setSeconds(0);
        time.setMilliseconds(0);
      default:
        break;
    }

    return time;
  }

  toJSON() {
    const output = [];
    if (this.#from.startsWith("now")) {
      output.push(this.#adjustTime(new Date()).toISOString());
    } else if (this.#from === "today") {
      const time = new Date();

      time.setUTCHours(this.#hour - this.#offset);
      time.setMinutes(this.#minute);
      time.setSeconds(0);
      time.setMilliseconds(0);

      output.push(this.#adjustTime(time).toISOString());
    } else {
      output.push(this.#staticReturn);
    }

    if (this.#isoDuration) {
      output.push("/", this.#isoDuration);
    }

    return output.join("");
  }
}
