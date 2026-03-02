/** Convenience class for using setTimeout. */
export default class Timer {
  constructor() {
    this.timer = this.callback = this.delay = null;
  }

  stop = () => {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = this.callback = this.delay = null;
  };

  start = (callback, delay) => {
    this.stop();
    this.callback = callback;
    this.delay = Number.isFinite(delay) ? delay : 2000;
    this.timer = setTimeout(callback, this.delay);
  };

  reset = () => {
    if (this.timer === null) return;
    this.start(this.callback, this.delay);
  };
}
