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

  const timestamps = document.querySelectorAll("time[data-wx-local-time]");
  for (let i = 0; i < timestamps.length; i += 1) {
    const timestamp = timestamps[i];

    const input = timestamp.getAttribute("datetime");

    const date = (() => {
      // The datetime value we set could be either an ISO8601 string, which
      // will have non-digit characters, or a Unix epoch timestamp, which only
      // includes digits. How we parse it depends on which it is.
      if (input.match(/[^\d]/)) {
        return new Date(Date.parse(input));
      }
      return new Date(Number.parseInt(input, 10) * 1_000);
    })();

    const formatter = timestamp.getAttribute("data-date-format") || "basic";

    timestamp.innerText = formatters.get(formatter).format(date);
  }
})();
