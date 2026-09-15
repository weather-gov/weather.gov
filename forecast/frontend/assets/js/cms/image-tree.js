/**
 * @file Handles interaction in the Wagtail Image Tree custom admin view.
 */

const treeContainer = document.querySelector(".tree-container");

function closeOpenMenus(exceptToggle) {
  document
    .querySelectorAll('.folder-menu-toggle[aria-expanded="true"]')
    .forEach((openToggle) => {
      if (openToggle !== exceptToggle) {
        openToggle.setAttribute("aria-expanded", "false");
        document.getElementById(
          openToggle.getAttribute("aria-controls"),
        ).hidden = true;
      }
    });
}

function expandToFocusedCollection() {
  const focusId = sessionStorage.getItem("imageTreeFocusCollectionId");
  if (!focusId) {
    return;
  }
  sessionStorage.removeItem("imageTreeFocusCollectionId");

  const contents = document.getElementById(`folder-${focusId}`);
  if (!contents) {
    return;
  }

  const node = contents.parentElement;
  let ancestorContents = node.closest(".folder-contents");
  while (ancestorContents) {
    ancestorContents.hidden = false;
    const parentNode = ancestorContents.parentElement;
    const toggle = parentNode.querySelector(
      ":scope > .folder-row > .folder-title",
    );
    if (toggle) {
      toggle.setAttribute("aria-expanded", "true");
    }
    ancestorContents = parentNode.parentElement.closest(".folder-contents");
  }

  node.classList.add("tree-node-highlight");
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => node.classList.remove("tree-node-highlight"), 1600);
}

if (treeContainer) {
  treeContainer.addEventListener("click", (event) => {
    const toggle = event.target.closest(".folder-title");
    if (toggle) {
      const contents = document.getElementById(
        toggle.getAttribute("aria-controls"),
      );
      const isExpanded = toggle.getAttribute("aria-expanded") === "true";

      toggle.setAttribute("aria-expanded", String(!isExpanded));
      contents.hidden = isExpanded;
      return;
    }

    const menuToggle = event.target.closest(".folder-menu-toggle");
    if (menuToggle) {
      const popup = document.getElementById(
        menuToggle.getAttribute("aria-controls"),
      );
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";

      closeOpenMenus(menuToggle);
      menuToggle.setAttribute("aria-expanded", String(!isExpanded));
      popup.hidden = isExpanded;
      return;
    }

    const addToggle = event.target.closest(".add-collection-toggle");
    if (addToggle) {
      const form = document.getElementById(
        addToggle.getAttribute("aria-controls"),
      );
      const isExpanded = addToggle.getAttribute("aria-expanded") === "true";

      addToggle.setAttribute("aria-expanded", String(!isExpanded));
      form.hidden = isExpanded;
      if (!isExpanded) {
        form.querySelector('input[name="name"]').focus();
      }

      const openMenu = addToggle.closest(".folder-menu-popup");
      if (openMenu) {
        openMenu.hidden = true;
        openMenu.previousElementSibling.setAttribute("aria-expanded", "false");
      }
      return;
    }

    const cancel = event.target.closest(".add-collection-cancel");
    if (cancel) {
      const form = cancel.closest(".add-collection-form");
      form.hidden = true;
      form.reset();
      return;
    }

    closeOpenMenus();
  });

  treeContainer.addEventListener("submit", (event) => {
    const form = event.target.closest(".add-collection-form");
    if (!form) {
      return;
    }
    event.preventDefault();

    const errorElement = form.querySelector(".add-collection-error");
    errorElement.hidden = true;

    fetch(form.action, { method: "POST", body: new FormData(form) })
      .then((response) =>
        response.json().then((data) => {
          if (!response.ok) {
            throw new Error(data.error || "Could not create collection.");
          }
          return data;
        }),
      )
      .then((data) => {
        sessionStorage.setItem("imageTreeFocusCollectionId", data.id);
        window.location.reload();
      })
      .catch((error) => {
        errorElement.textContent = error.message;
        errorElement.hidden = false;
      });
  });

  expandToFocusedCollection();
}
