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
        timeZone: "America/Denver",
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
        timeZone: "America/Denver",
      }),
    ],
  ]);

  const timestamps = document.querySelectorAll("time[data-wx-local-time]");
  for (let i = 0; i < timestamps.length; i += 1) {
    const timestamp = timestamps[i];
    const date = new Date(
      Number.parseInt(timestamp.getAttribute("datetime"), 10) * 1_000,
    );
    const formatter = timestamp.getAttribute("data-date-format") || "basic";

    timestamp.innerText = formatters.get(formatter).format(date);
  }
})();
