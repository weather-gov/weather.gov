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

// When the user allows us to ask for their location, store the location that
// the browser gives us. We can use this saved location instead of querying the
// browser again so the page loads faster the next time. We can ask the browser
// for their location in the background and then update the UI when we get the
// new value back.
const LOCAL_STORAGE_KEY = "weathergov - user browser location";

export default class Location {
  constructor() {
    this._geolocation = navigator.geolocation;
  }

  #_getSuccess(resolve) {
    return (o) => {
      const {
        coords: { latitude, longitude },
        timestamp,
      } = o;

      // Store the new location so we can use it the next time the user loads
      // the page.
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ coords: { latitude, longitude }, timestamp })
      );
      resolve(o);
    };
  }

  #_getFailure(reject) {
    return ({ code }) => {
      switch (code) {
        case 1:
          return reject(new PermissionDeniedLocationError());

        case 2:
          return reject(new UnavailableLocationError());

        case 3:
          return reject(new TimeoutLocationError());

        default:
          return reject(new UnknownLocationError());
      }
    };
  }

  async get() {
    try {
      // See if we have stored the user's location in their browser. If so, we
      // may be able to reuse it instead of getting their location again. To
      // protect against weird data, all of this is in a try/catch. The catch
      // doesn't do anything, so any exceptions will fall back to fetching the
      // user's location as if it is not stored.
      const storedLocation = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_KEY)
      );

      if (storedLocation) {
        const thirtyMinutesAgo = Date.now() - 1_800_000;
        // We probably want locations to expire from storage. For now, we'll use
        // the stored location only if it is less than 30 minutes old
        if (storedLocation.timestamp > thirtyMinutesAgo) {
          // Update the user's location in the background. Whenever this is
          // finished, then we can update the UI. However, we can go ahead and
          // populate the UI based on the stored location.
          this._geolocation.getCurrentPosition(
            this.#_getSuccess(() => {}),
            () => {}
          );
          return storedLocation;
        }
      }
    } catch (_) {}

    return new Promise((resolve, reject) => {
      this._geolocation.getCurrentPosition(
        this.#_getSuccess(resolve),
        this.#_getFailure(reject)
      );
    });
  }

  static async get() {
    const L = new Location();
    return L.get();
  }
}
