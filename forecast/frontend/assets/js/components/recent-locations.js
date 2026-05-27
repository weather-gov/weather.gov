/** @file Manage a visitor's recent locations in local storage. */

const RECENT_LOC_STORAGE = "wxgov_recent_locations";

/**
 * @typedef {Object} RecentLocation from local storage
 * @property {string} url the point forecast url for the location
 * @property {string} text the human-readable location name
 */

/**
 * Get the list of recent locations from local storage.
 *
 * @returns {RecentLocation}
 */
export function getRecentLocations() {
  try {
    const existing = localStorage.getItem(RECENT_LOC_STORAGE);
    const parsed = JSON.parse(existing ?? "[]");

    // Check if any saved locations still have the old /point/lat/long url format
    const needsUpdate = parsed.filter(({ url }) => url.startsWith("/point"));

    if (needsUpdate.length > 0) {
      // Prepend the forecast path to any URLs that need it
      const updated = parsed.map(({ url, ...rest }) => ({
        ...rest,
        url: url.startsWith("/forecast") ? url : `/forecast${url}`,
      }));
      localStorage.setItem(RECENT_LOC_STORAGE, JSON.stringify(updated));
      return updated;
    }
    return parsed;
  } catch (e) {
    return [];
  }
}

/**
 * Insert a recent location into local storage.
 * If the location already exists, move it to the top.
 *
 * @param {RecentLocation} obj - the recent location
 */
export function addRecentLocation(obj) {
  try {
    // First we need to see if there are any existing
    // items already saved in the saved searches array
    const existing = localStorage.getItem(RECENT_LOC_STORAGE);
    const parsed = JSON.parse(existing ?? "[]");
    // Now remove any items for the same URL. This way we don't
    // end up having a whole list of the same place
    const filtered = parsed.filter(({ url }) => url !== obj.url);
    // Just keep the most recent ten.
    const sliced = filtered.slice(0, 9);

    // Put the new entry at the front of the list
    sliced.unshift(obj);

    // Now serialize and save
    localStorage.setItem(RECENT_LOC_STORAGE, JSON.stringify(sliced));
  } catch (e) {
    /* do nothing */
  }
}
