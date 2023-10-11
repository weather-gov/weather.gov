const main = () => {
  const locale = (() => {
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
      return navigator.languages[0];
    }
    if (navigator.language) {
      return navigator.language;
    }
    return "en-US";
  })();

  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const timestamps = document.querySelectorAll("weather-timestamp");
  for (let i = 0; i < timestamps.length; i += 1) {
    const timestamp = timestamps[i];
    const date = new Date(
      Number.parseInt(timestamp.getAttribute("data-utc"), 10) * 1_000,
    );

    timestamp.innerText = formatter.format(date);
  }
};

if (document.readyState !== "loading") {
  main();
} else {
  document.addEventListener("DOMContentLoaded", main);
}
