// The click event for each toggle button will
// update the visual selection class and also update the
// selection data attribute
const toggleHandler = ({ target: button }) => {
  const toggleContainer = button?.closest(".wx-forecast-details-toggle");
  const selectedName = button?.dataset.selectionName;

  toggleContainer?.setAttribute("data-selected", selectedName);

  const buttons = Array.from(toggleContainer.getElementsByTagName("button"));
  buttons.forEach((btn) => {
    btn.classList.add("usa-button--outline");
    if (btn.dataset.selectionName === selectedName) {
      btn.classList.remove("usa-button--outline");
    }
  });
};

Array.from(document.getElementsByClassName("wx-forecast-details-toggle"))
  .forEach(toggleContainer => {
    const buttons = Array.from(toggleContainer.getElementsByTagName("button"));
    buttons.forEach(button => {
      button.addEventListener("click", toggleHandler);
    });
  });
