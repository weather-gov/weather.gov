window.addEventListener("wx-tab-focused", (e) => {
  const day = e.detail.dataset.alertDay;
  const target = document.getElementById(
    `county-daily-alert-container-day-${day ? day : "all"}`,
  );

  // Don't do anything if we don't have a valid target node. This really
  // shouldn't happen but let's not screw up the UX if it does.
  if (target) {
    // Hide all of the alert accordion containers
    [
      ...document.querySelectorAll("#county-daily-alert-container > div"),
    ].forEach((node) => {
      node.classList.add("display-none");
    });

    // Then unhide the selected one
    target.classList.remove("display-none");
  }
});
