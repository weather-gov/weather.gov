window.addEventListener("wx-tab-focused", (e) => {
  const day = e.detail?.dataset?.alertDay;

  const allAlerts = [...document.querySelectorAll("wx-alerts > div")];

  if (day === "all") {
    // If the day is "all", show everything
    allAlerts.forEach((node) => {
      node.classList.remove("display-none");
    });
  } else {
    // Otherwise, start by hiding everything
    allAlerts.forEach((node) => {
      node.classList.add("display-none");
    });

    // And unhide any target nodes.
    [...document.querySelectorAll(`[data-alert-day-${day}]`)].forEach((node) =>
      node.classList.remove("display-none"),
    );
  }
});
