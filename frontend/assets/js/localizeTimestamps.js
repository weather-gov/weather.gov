(() => {
  const locale = (() => {
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
      return navigator.languages[0];
    }
    if (navigator.language) {
      return navigator.language;
    }
    return "en-US";
  })();

  const formatters = new Map([
    [
      "basic",
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }),
    ],
    [
      "M d Y T",
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
      }),
    ],
  ]);

  const timestamps = Array.from(
    document.querySelectorAll("time[data-wx-local-time]"),
  ).filter((node) => node.getAttribute("datetime").length > 0);

  timestamps.forEach((timestamp) => {
    const input = timestamp.getAttribute("datetime");

    const date = new Date(Date.parse(input));

    const formatter = timestamp.getAttribute("data-date-format") || "basic";

    timestamp.innerText = formatters.get(formatter).format(date);
  });
})();
