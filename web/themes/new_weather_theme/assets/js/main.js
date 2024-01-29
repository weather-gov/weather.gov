import setupComponents from "./components/index.js";

const main = () => {
  setupComponents();

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

  const timestamps = document.querySelectorAll("weather-timestamp");
  for (let i = 0; i < timestamps.length; i += 1) {
    const timestamp = timestamps[i];
    const date = new Date(
      Number.parseInt(timestamp.getAttribute("data-utc"), 10) * 1_000,
    );
    const formatter = timestamp.getAttribute("data-date-format") || "basic";

    timestamp.innerText = formatters.get(formatter).format(date);
  }
};

if (document.readyState !== "loading") {
  main();
} else {
  document.addEventListener("DOMContentLoaded", main);
}
