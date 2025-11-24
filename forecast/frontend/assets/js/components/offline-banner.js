import Timer from "./timer.js";

// Store a reference to the original fetch function
window._fetch = window.fetch;

const replaceFetch = () => {
  const banner = document.querySelector("#wx-offline-banner__container");
  const template = document.querySelector("#wx-offline-banner__template");
  const importantHosts = JSON.parse(
    document.getElementById("third-party-site-list").textContent,
  );
  importantHosts.push(window.location.host);
  const maxDelay = 1800000; // 30 minutes

  const debouncer = {
    banner: new Timer(),
    ariaLive: new Timer(),
  };
  const metronome = {
    ping: new Timer(),
  };

  const hideOfflineBanner = () => {
    try {
      banner.innerHTML = "";
      metronome.ping.stop();
      const text = gettext("js.offline-banner.aria.you-are-back-online.01");
      window.dispatchEvent(
        new CustomEvent("wx-announce", { detail: { text } }),
      );
    } catch (_) {
      /* do nothing */
    }
  };

  const checkOffline = () => {
    if (!navigator.onLine) {
      metronome.ping.reset();
    } else {
      window._fetch
        .apply(this, ["/health/"])
        .then((_) => hideOfflineBanner())
        .catch((_) => metronome.ping.reset());
    }
  };

  const showOfflineBanner = () => {
    try {
      if (!banner.children.length) {
        debouncer.ariaLive.start(() => {
          banner.appendChild(template.content.cloneNode(true));
          banner.scrollIntoView();
        }, 1000);
      }
      metronome.ping.start(checkOffline);
    } catch (_) {
      /* do nothing */
    }
  };

  const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

  /**
   * This is a wrapper around the original window.fetch, to provide
   * automatic retry and offline banners.
   *
   * By default, it retries 10 times, but you can pass `wxMaxRetries`:
   *
   *     fetch("url", {..}, {wxMaxRetries: 5})
   *
   * The original fetch is at window._fetch.
   */
  window.fetch = (resource, options = {}) => {
    const maxRetries = options.wxMaxRetries || 10;
    const tries = options.wxTries || 1;
    let requestedHost;
    try {
      requestedHost = new URL(resource).host;
    } catch (error) {
      /* do nothing */
    }

    if (importantHosts.includes(requestedHost)) {
      return window._fetch(resource, options).catch((error) => {
        showOfflineBanner();
        if (tries <= maxRetries) {
          options.wxTries = tries + 1;
          options.wxMaxRetries = maxRetries;
          const jitter = Math.floor(Math.random() * 100) + 1;
          const delay = Math.min(500 * 2 ** tries + jitter, maxDelay);
          return wait(delay).then(() => window.fetch(resource, options));
        } else {
          throw error;
        }
      });
    } else {
      return window._fetch(resource, options);
    }
  };
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", replaceFetch, {
    once: true,
  });
} else {
  replaceFetch();
}
