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
    this.delay = delay;
    this.timer = setTimeout(callback, delay || 2000);
  };

  reset = () => {
    if (this.timer === null) return;
    this.start(this.callback, this.delay);
  };
}
