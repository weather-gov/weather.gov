import log from "./log.js";

export class PermissionDeniedLocationError extends Error {
  constructor() {
    super("Permission to retrieve location was denied.");
  }
}

export class UnavailableLocationError extends Error {
  constructor() {
    super("Location information is not available");
  }
}

export class TimeoutLocationError extends Error {
  constructor() {
    super("Retrieving location timed out");
  }
}
export class UnknownLocationError extends Error {
  constructor() {
    super("Unknown error retrieving location");
  }
}

export default class Location {
  constructor() {
    this._geolocation = navigator.geolocation;
  }

  #_getSuccess(resolve) {
    return (o) => {
      log("[loc] got location");
      resolve(o);
    };
  }

  #_getFailure(reject) {
    return ({ code }) => {
      log(`[loc] Error. Code: ${code}`);
      switch (code) {
        case 1:
          log(`[loc] Error: permission denied`);
          return reject(new PermissionDeniedLocationError());

        case 2:
          log(`[loc] Error: location unavailable`);
          return reject(new UnavailableLocationError());

        case 3:
          log(`[loc] Error: location timed out`);
          return reject(new TimeoutLocationError());

        default:
          log(`[loc] Error: unknown error`);
          return reject(new UnknownLocationError());
      }
    };
  }

  async get() {
    return new Promise((resolve, reject) => {
      this._geolocation.getCurrentPosition(
        this.#_getSuccess(resolve),
        this.#_getFailure(reject)
      );
    });
  }

  static async get() {
    log("[loc] getting location");
    const L = new Location();
    return L.get();
  }
}
