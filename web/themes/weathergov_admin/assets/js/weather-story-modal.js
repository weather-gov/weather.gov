/**
 * Weather Story Create Confirm Modal
 * --------------------------------
 * Will trigger a dialog modal popup in the
 * event that a Weather Story with the given
 * WFO already exists and is published.
 */

/**
 * Generate the inner modal dialog markup
 * for a given array of WFO term entry objects
 * as provided by our Drupal hook
 * (See `weathergov_admin_preprocess_page__node__add__weather_story`)
 */
const getMarkupForEntries = (entries) => {
  // We assume that all incoming entries are the
  // same WFO term, but might each reference a
  // different node of existing published content.
  const wfoName = entries[0].name;
  let infoPrefix = `There is already a published Weather Story for the ${wfoName} WFO:`;
  if (entries.length > 1) {
    infoPrefix = `There are already published Weather Stories for the ${wfoName} WFO:`;
  }
  const linkListLinks = entries
    .map((entry) => `<li><a href=${entry.nodeUrl} target="_blank">${entry.nodeTitle}</a></li>`)
    .join("\n");
  const linkList = `<ul>${linkListLinks}</ul>`;
  return `<p>${infoPrefix}</p>\n${linkList}`;
};

const WeatherStoryModalHandler = {
  /**
   * Take an array of objects that represents
   * existing WFO Terms that already
   * have published Weather Stories.
   * These objects will have the keys:
   *     id - The WFO Term ID
   *     name - The name of the WFO
   *     code - The WFO three-letter code
   */
  setExisting: (aDictArray) => {
    WeatherStoryModalHandler.entries = aDictArray;
  },

  /**
   * Responds true if the given id
   * matches one of our existing
   * WFO Term ids
   */
  hasExistingId: (anId) => {
    if (WeatherStoryModalHandler.entries) {
      return WeatherStoryModalHandler.entries
        .map((entry) => entry.id)
        .includes(anId);
    }

    return false;
  },

  /**
   * A handler for any submit events at the
   * document level. Will check for matches.
   */
  submitHandler: (event) => {
    // We only care about submit events where
    // the publish button was pushed.
    if (event.target.id !== "edit-publish") {
      return;
    }
    const value = document.querySelector(
      'input[data-drupal-selector^="edit-field-wfo"]',
    ).value;
    if (!value || value === "") {
      return;
    }
    const idMatch = value.match(/^.*\(([0-9]+)\).*$/);
    const id = idMatch[1];
    const matchingEntries = WeatherStoryModalHandler.entries.filter((entry) => entry.id === id);
    if (matchingEntries.length) {
      event.preventDefault();
      WeatherStoryModalHandler.showModalWith(id, event.target, matchingEntries);
    }
  },

  /**
   * Show the modal, binding appropriate methods
   * to the buttons inside of it
   */
  showModalWith: (id, submitterElement, matchingEntries) => {
    // Add the text to the modal
    const description = document.createElement("div");
    description.innerHTML = getMarkupForEntries(matchingEntries);
    WeatherStoryModalHandler.modal.prepend(description);

    // Add event handlers to the modal's buttons
    Array.from(
      WeatherStoryModalHandler.modal.querySelectorAll("button"),
    ).forEach((button) => {
      button.addEventListener("click", () => {
        // The data attribute will reference the id
        // of a target button to programmatically click
        // on the page's actual form.
        // If there is no target, the modal will simply close
        const targetButton = document.getElementById(
          button.dataset.modalSubmitterTarget,
        );
        if (!targetButton) {
          WeatherStoryModalHandler.modal.close();
        } else {
          submitterElement.removeEventListener(
            "click",
            WeatherStoryModalHandler.submitHandler,
          );
          WeatherStoryModalHandler.modal.close();
          targetButton.click();
        }
      });
    });

    // Now show the modal
    WeatherStoryModalHandler.modal.showModal();
  },

  get modal() {
    return document.querySelector("dialog#weather-story-confirm-modal");
  },
};

document.addEventListener("DOMContentLoaded", () => {
  // First, we find the script tag containing the
  // JSON with any published WFO stories
  const existingEl = document.getElementById("existing-wfo-entries");

  // Make sure there is a publish button
  const publishButton = document.getElementById("edit-publish");
  if (!publishButton) {
    return;
  }

  // Next, ensure that the corresponding modal is
  // on the page
  if (!existingEl || !WeatherStoryModalHandler.modal) {
    return;
  }

  // Parse the JSON and load it into the
  // modal handler
  const existingItems = JSON.parse(existingEl.textContent);
  WeatherStoryModalHandler.setExisting(existingItems);

  // Listen for click events on the publish button
  publishButton.addEventListener(
    "click",
    WeatherStoryModalHandler.submitHandler,
  );
});
