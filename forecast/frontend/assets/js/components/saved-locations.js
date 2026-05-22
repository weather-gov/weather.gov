/** @file Manage a visitor's recent/favorite locations in local storage. */

const SAVED_LOC_STORAGE = "wxgov_saved_locations";
const RECENT_LOC_STORAGE = "wxgov_recent_locations";

/**
 * @typedef {Object} SavedLocations from local storage
 * @property {Object.<string, string>} hashed object of saved location (lowercase-text : url)
 * @property {Array<SavedLocation>} sorted sorted list of saved locations
 */

/**
 * @typedef {Object} SavedLocation from local storage
 * @property {string} text the human-readable location name
 * @property {string} url the point forecast url for the location
 */

/**
 * Get JSON parsed local storage for saved locations
 * @returns {SavedLocations}
 */
function getParsedSavedLocationStorage() {
  const storage = localStorage.getItem(SAVED_LOC_STORAGE);
  const parsedStorage = JSON.parse(storage ?? "{}");
  return parsedStorage;
}

/**
 * Set saved location local storage to new JSON item
 * @param {SavedLocations} newStorage saved location collection to set
 */
function setSavedLocationStorage(newStorage) {
  localStorage.setItem(SAVED_LOC_STORAGE, JSON.stringify(newStorage));
}

/**
 * Get the sorted list of saved locations from local storage
 * @returns {Array<SavedLocation>}
 */
export function getSavedLocations() {
  const current = getParsedSavedLocationStorage();

  return current?.sorted ? current.sorted : [];
}

/**
 * Returns if location is within the saved location local storage
 * @param {string} locText location to match if in saved location storage
 * @returns {boolean}
 */
export function hasSavedLocation(locText) {
  let found = false;
  if (locText?.length) {
    const locLower = locText?.toLowerCase();
    const existing = getParsedSavedLocationStorage();
    found = existing?.hashed && Object.hasOwn(existing.hashed, locLower);
  }
  return found;
}

/**
 * Adds a new location to saved locations in local storage, maintaining sorted order
 * @param {SavedLocation} obj saved location object to add to storage
 */
export function addSavedLocation(obj) {
  // Validate obj
  if (!obj && !obj?.text?.toLowerCase() && !obj?.url) return;

  const textLower = obj.text.toLowerCase();
  const existing = getParsedSavedLocationStorage();
  const hashed = existing?.hashed ?? {};
  const sorted = existing?.sorted ?? [];

  if (!Object.hasOwn(hashed, textLower)) {
    if (sorted?.length) {
      // Find the correct sorted location to insert new element based on text
      const largerElemIndex = sorted.findIndex((item) => {
        return item?.text?.toLowerCase() > textLower;
      });
      // Insert new element before the larger element
      if (largerElemIndex === -1) {
        sorted.push(obj);
      } else {
        sorted.splice(largerElemIndex, 0, obj);
      }
    } else {
      sorted.push(obj);
    }
    hashed[textLower] = obj?.url;
    setSavedLocationStorage({
      hashed: hashed,
      sorted: sorted,
    });
  }
}

/**
 * Removes the saved location from storage that matches the location string
 * @param {string} loc location string to remove from storage
 */
export function removeSavedLocation(loc) {
  const locLower = loc?.toLowerCase();
  const existing = getParsedSavedLocationStorage();
  const existingSorted = existing?.sorted ?? [];
  const existingHashed = existing?.hashed ?? {};
  const existingElemIdx = existingSorted.findIndex((item) => {
    return item?.text?.toLowerCase() === locLower;
  });

  if (existingElemIdx > -1) {
    // Remove element in place and update storage with new collection
    existingSorted.splice(existingElemIdx, 1);
    delete existingHashed[loc.toLowerCase()];
    setSavedLocationStorage({ sorted: existingSorted, hashed: existingHashed });
  }
}
