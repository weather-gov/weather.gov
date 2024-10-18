Array.from(document.querySelectorAll(".wx-forecast-details-toggle"))
  .forEach(toggleContainer => {
    // The click event for each toggle button will
    // update the visual selection class and also update the
    // selection data attribute
    const buttons = Array.from(toggleContainer.querySelectorAll("button"));
    buttons.forEach(button => {
      button.addEventListener("click", () => {
        const selectedName = button.dataset.selectionName;
        toggleContainer.setAttribute("data-selected", button.dataset.selectionName);
        buttons.forEach(btn => {
          if(btn.dataset.selectionName === selectedName){
            btn.classList.remove("usa-button--outline");
          } else {
            btn.classList.add("usa-button--outline");
          }
        });
      });
    });
  });
