const getRelevantDOMNodes = () => ({
  alerts: [...document.querySelectorAll("wx-alerts > div[data-alert]")],
  legends: [
    ...document.querySelectorAll(
      ".wx_alert_map_legend > [data-alert-map-legend-level]",
    ),
  ],
  emptyState: [...document.querySelectorAll("[data-no-alerts-day]")],
});

const all = () => {
  const { alerts, emptyState, legends } = getRelevantDOMNodes();

  // Display all alerts
  alerts.forEach((node) => {
    node.classList.remove("display-none");
  });

  // Display all relevant alert map legends
  legends.forEach((node) => node.classList.remove("display-none"));

  // Hide all empty state text except for day 0.
  emptyState.forEach((node) => {
    if (node.dataset.noAlertsDay === "0") {
      node.classList.remove("display-none");
    } else {
      node.classList.add("display-none");
    }
  });
};

const specificDay = (day, dayLevels) => {
  const { alerts, emptyState, legends } = getRelevantDOMNodes();

  // Start by hiding everything
  alerts.forEach((node) => {
    node.classList.add("display-none");
  });
  legends.forEach((node) => node.classList.add("display-none"));

  // And then un-hide the relevant alerts.
  const dayAlerts = [...document.querySelectorAll(`[data-alert-day-${day}]`)];
  dayAlerts.forEach((node) => node.classList.remove("display-none"));

  // As well as alert map legends that are appropriate for the day.
  legends.forEach((node) => {
    if (dayLevels.includes(node.dataset.alertMapLegendLevel)) {
      node.classList.remove("display-none");
    }
  });

  // Hide all empty state text except the relevant day.
  emptyState.forEach((node) => {
    if (node.dataset.noAlertsDay === day) {
      node.classList.remove("display-none");
    } else {
      node.classList.add("display-none");
    }
  });
};

window.addEventListener("wx-tab-focused", (e) => {
  const day = e.detail?.dataset?.alertDay;

  // "All" is a special case.
  if (day === "all") {
    all();
  }
  // Otherwise, we just want to make sure we have a value. If we don't, then
  // we didn't get here from focusing a county alert tab, and we don't need
  // to do anything else. Huzzah!
  else if (day) {
    const dayLevels =
      e.detail?.dataset?.alertLevels
        ?.split(" ")
        .filter((i) => i.trim().length > 0) ?? [];

    specificDay(day, dayLevels);
  }
});
