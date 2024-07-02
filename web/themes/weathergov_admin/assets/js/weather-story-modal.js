/* eslint no-use-before-define: 0 */
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

/**
 * Find the dialog element on the page
 * and return it
 */
const getModal = () => document.querySelector("dialog#weather-story-confirm-modal");

/**
 * Attempt to retrieve an array of objects
 * corresponding to published Weather Story
 * WFO information, as provided by the server.
 * This information will be stored as JSON in a
 * script tag
 */
const getExistingWFOEntries = () => {
  const jsonEl = document.getElementById("existing-wfo-entries");
  if(!jsonEl){
    return [];
  }

  return JSON.parse(jsonEl.textContent);
};

/**
 * Handles showing the dialog element in modal form.
 *
 * This function will also add the appropriate event handlers
 * to the modal window's buttons (see below)
 * and will prepend some descriptive markup -- including links
 * to existing Weather Story nodes that match -- to the
 * beginning of the dialog
 *
 * Button delegation: The buttons in the dialog have been
 * templated in Drupal to have a
 * `data-modal-submitter-target` property whose value
 * is the ID of the button on the actual page that should
 * be clicked programmatically when selected.
 */
const showModal = (submitterElement, matchingEntries) => {
  const modal = getModal();
  // Add the text to the modal
  const description = document.createElement("div");
  description.innerHTML = getMarkupForEntries(matchingEntries);
  modal.prepend(description);

  // Add event handlers to the modal's buttons
  Array.from(
    modal.querySelectorAll("button"),
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
        modal.close();
      } else {
        submitterElement.removeEventListener(
          "click",
          publishClickHandler,
        );
        modal.close();
        targetButton.click();
      }
    });
  });

  // Now show the modal
  modal.showModal();
};

/**
 * Click handler for the Publish button.
 * Will stop the default button action,
 * which is form submission, if there
 * are matching WFOs in the entries,
 * then will display the dialog
 */
const publishClickHandler = (event) => {
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
  const idMatch = value.match(/^.*\(([0-9]+)\).*$/); // actual value looks like "Nashville (184)"
  const id = idMatch[1];
  const matchingEntries = getExistingWFOEntries().filter((entry) => entry.id === id);
  if (matchingEntries.length) {
    event.preventDefault();
    showModal(event.target, matchingEntries);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  
  // Make sure there is a publish button
  const publishButton = document.getElementById("edit-publish");
  if (!publishButton) {
    return;
  }

  // Get the information about existing Weather Stories
  // and bail out if the list is empty
  const existing = getExistingWFOEntries();
  const modal = getModal();
  if(existing.length === 0 || !modal){
    return;
  }

  // Listen for click events on the publish button
  publishButton.addEventListener(
    "click",
    publishClickHandler,
  );
});
