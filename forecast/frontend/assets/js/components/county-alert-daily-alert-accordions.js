window.addEventListener("wx-tab-focused", (e) => {
  const day = e.detail?.dataset?.alertDay;

  // This event can be triggered by the forecast tabs too. It should never
  // trigger *this* code, but we'll guard against that by making the list of
  // selected levels empty if it's not provided.
  const levels =
    e.detail?.dataset?.alertLevels
      ?.split(" ")
      .filter((i) => i.trim().length > 0) ?? [];

  const legends = [
    ...document.querySelectorAll(".wx_alert_map_legend > div[id]"),
  ];

  const allAlerts = [...document.querySelectorAll("wx-alerts > div")];

  if (day === "all") {
    // If the day is "all", show everything
    allAlerts.forEach((node) => {
      node.classList.remove("display-none");
    });
    legends.forEach((node) => node.classList.remove("display-none"));
  } else {
    // Otherwise, start by hiding everything
    allAlerts.forEach((node) => {
      node.classList.add("display-none");
    });
    legends.forEach((node) => node.classList.add("display-none"));

    // And unhide any target nodes.
    [...document.querySelectorAll(`[data-alert-day-${day}]`)].forEach((node) =>
      node.classList.remove("display-none"),
    );
    // And unhide associated legend items
    levels.forEach((level) => {
      document
        .getElementById(`wx-alert-legend-level-${level}`)
        .classList.remove("display-none");
    });
  }
});
