// If we have translation support available, use it. Otherwise have a fallback.
const prompt = window.ngettext
  ? window.ngettext("js.inline-panel-confirm-delete-prompt.01")
  : "Are you sure you want to delete this item? Click OK to delete, or Cancel to return to the editor.";

const deleteEventInterceptor = (e) => {
  // Prompt the user to confirm their click. If they don't confirm, prevent the
  // event's default behavior and stop its propagation. This will prevent the
  // original event handler from ever firing. Hooray!
  if (!confirm(prompt)) {
    e.preventDefault();
    e.stopPropagation();
  }
};

// Given a DOM elelment, we will find all of its children that selector below.
// The w-panel__header class is applied to the heading of an item in an inline
// panel. Within the heading are a collection of buttons. We want the delete one.
const preemptDeleteButtons = (container) => {
  container
    ?.querySelectorAll(`.w-panel__header button[type="button"][title="Delete"]`)
    .forEach((deleteButton) => {
      // We need to be able to capture click events on the button before any
      // of its other event handlers. In order to do that, we actually need to
      // attach our event listener to an element higher up in the DOM. But we
      // don't want to catch the events of any of the other buttons. To solve
      // that, we create a brand new DOM node, move the button into it, and
      // then put the wrapper where the button used to be.
      const wrapper = document.createElement("span");
      deleteButton.parentNode.replaceChild(wrapper, deleteButton);
      wrapper.append(deleteButton);

      // Now that we have a middle node, we can attach to its click event, but
      // we'll use the capture flag so that we get the event BEFORE the button
      // does. Otherwise we'd get it after, if at all.
      wrapper.addEventListener("click", deleteEventInterceptor, {
        capture: true,
      });
    });
};

// When the inline panel is first loaded, it fires this w-formset:ready event.
// In response, we should find the nearest ancestor to the target that has the
// data-wx-confirm-delete attribute. This attribute is specified in the panel
// configuration for the model. We will preempt all of the delete buttons in
// the data-wx-confirm-delete ancestor.
//
// We only need to handle this event once.
document.addEventListener(
  "w-formset:ready",
  (e) => {
    preemptDeleteButtons(e?.target?.closest("[data-wx-confirm-delete]"));
    return;
  },
  { once: true },
);

// Any time an item is added to the inline panel, it fires this w-formset:added
// event. The target is the container node for the new item. We want to check if
// any of its ancestors have the data-wx-confirm-delete attribute first, and if
// any do, then we want to preempt the delete button on this new item.
document.addEventListener("w-formset:added", (e) => {
  if (e?.target?.closest("[data-wx-confirm-delete]")) {
    preemptDeleteButtons(e.target);
  }
});
