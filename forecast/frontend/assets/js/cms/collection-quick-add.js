/**
 * @file Adds a "+ New collection" control next to collection dropdowns in the CMS admin
 * (image upload/edit forms, multiple upload page). Used by: backend.wagtail_hooks.py
 */

function csrfToken() {
  const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
  return input ? input.value : "";
}

function createCollection(name, parentId) {
  return fetch("/cms/image-tree/add-collection/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRFToken": csrfToken(),
    },
    body: `name=${encodeURIComponent(name)}&parent_id=${encodeURIComponent(parentId)}`,
  }).then((response) =>
    response.json().then((data) => {
      if (!response.ok) {
        throw new Error(data.error || "Could not create collection.");
      }
      return data;
    }),
  );
}

function attachQuickAdd(select) {
  if (select.dataset.quickAddAttached) {
    return;
  }
  select.dataset.quickAddAttached = "true";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "button button-secondary collection-quick-add-toggle";
  toggle.textContent = "+ New collection";

  const panel = document.createElement("span");
  panel.className = "collection-quick-add-panel";
  panel.hidden = true;

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "New collection name";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "button collection-quick-add-form-button";
  addButton.textContent = "Add";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className =
    "button button-secondary collection-quick-add-form-button";
  cancelButton.textContent = "Cancel";

  const error = document.createElement("span");
  error.className = "collection-quick-add-error";
  error.hidden = true;

  panel.append(input, addButton, cancelButton, error);
  select.insertAdjacentElement("afterend", toggle);
  toggle.insertAdjacentElement("afterend", panel);

  const closePanel = () => {
    panel.hidden = true;
    error.hidden = true;
    input.value = "";
  };

  const submit = () => {
    const name = input.value.trim();
    if (!name) {
      error.textContent = "Please enter a name.";
      error.hidden = false;
      input.focus();
      return;
    }

    addButton.disabled = true;
    createCollection(name, select.value)
      .then((data) => {
        const option = document.createElement("option");
        option.value = data.id;
        option.textContent = data.label;
        select.appendChild(option);
        option.selected = true;
        closePanel();
      })
      .catch((err) => {
        error.textContent = err.message;
        error.hidden = false;
      })
      .finally(() => {
        addButton.disabled = false;
      });
  };

  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      input.focus();
    }
  });

  cancelButton.addEventListener("click", closePanel);
  addButton.addEventListener("click", submit);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Escape") {
      closePanel();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll("#id_collection, #id_addimage_collection")
    .forEach(attachQuickAdd);
});
