/** @file Manage a visitor's recent/favorite locations in local storage. */

/**
 * @typedef {Object} SavedLocation from local storage
 * @property {string} url the point forecast url for the location
 * @property {string} text the human-readable location name
 */

/**
 * Get the list of saved locations from local storage.
 *
 * @returns {SavedLocation}
 */
export function getSavedLocations() {
  try {
    return JSON.parse(localStorage.getItem("wxgov_recent_locations") ?? "[]");
  } catch (e) {
    return [];
  }
}

/**
 * Insert a saved location into local storage.
 * If the location already exists, move it to the top.
 *
 * @param {SavedLocation} obj - the saved location
 */
export function addSavedLocation(obj) {
  try {
    // First we need to see if there are any existing
    // items already saved in the saved searches array
    const existing = localStorage.getItem("wxgov_recent_locations");
    const parsed = JSON.parse(existing ?? "[]");
    // Now remove any items for the same URL. This way we don't
    // end up having a whole list of the same place
    const filtered = parsed.filter(({ url }) => url !== obj.url);
    // Just keep the most recent ten.
    const sliced = filtered.slice(0, 9);

    // Put the new entry at the front of the list
    sliced.unshift(obj);

    // Now serialize and save
    localStorage.setItem("wxgov_recent_locations", JSON.stringify(sliced));
  } catch (e) {
    /* do nothing */
  }
}
