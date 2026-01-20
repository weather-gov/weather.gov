const deliveredInputRegex = /entries-\d+-delivered/i;

const getChangeHandler = (checkbox, dateInput, wrapper) => () => {
  if (checkbox.checked) {
    // Show the date wrapper
    wrapper.style.display = "";

    // And set its value to the current date. Presumably if someone
    // is just now making a thing delivered, now is a good time for
    // it to be done. But they can change it if they want to.
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");

    dateInput.value = `${year}-${month}-${day}`;
  } else {
    wrapper.style.display = "none";
  }
};

const attachCheckboxes = (checkboxes) => {
  checkboxes.forEach((checkbox) => {
    if (deliveredInputRegex.test(checkbox.name)) {
      // Only continue if the input's name matches what we
      // expect for the "delivered" checkbox

      // This checkbox should have a corresponding date input,
      // and its name should be essentially matching, but for
      // the last part.
      //    entries-0-delivered matches to
      //    entries-0-delivery_date
      const dateInputName = checkbox.name.replace(
        /-delivered$/,
        "-delivery_date",
      );

      // See if it exists. It'd be weird if it didn't, but
      // might as well be safe rather than assume.
      const dateInput = document.querySelector(
        `div.w-panel__wrapper input[name="${dateInputName}"]`,
      );

      if (dateInput) {
        // Get the Wagtail panel wrapper for the date input. We will
        // hide and show this based on the condition of the checkbox.
        const wrapper = dateInput.closest("div.w-panel__wrapper");

        // If the checkbox is initially not checked, go ahead and
        // hide the panel.
        if (!checkbox.checked) {
          wrapper.style.display = "none";
        }

        // Listen for the checkbox to change.
        checkbox.addEventListener(
          "change",
          getChangeHandler(checkbox, dateInput, wrapper),
        );
      }
    }
  });
};

// Get all the checkboxes inside Wagtail panels and attach up to them.
attachCheckboxes(
  document.querySelectorAll(`div.w-panel__wrapper input[type="checkbox"]`),
);

// Wagtail event when a new InlinePanel is added. Roadmap entries are
// rendered in inline panels, so we want to listen for that.
document.addEventListener("w-formset:added", (e) => {
  // Scan all the checkboxes to find the "delivered" ones.
  attachCheckboxes(e.target.querySelectorAll(`input[type="checkbox"]`));
});
