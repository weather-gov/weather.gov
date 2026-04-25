const initLazyLoad = () => {
  const elements = document.querySelectorAll("[wx-lazy-load]");
  elements.forEach(async (el) => {
    const src = el.getAttribute("wx-lazy-load");
    if (!src) return;

    try {
      const response = await fetch(src);
      if (response.ok) {
        const html = await response.text();
        el.innerHTML = html;

        // If the partial returned alerts, un-hide the alerts tab button
        if (el.querySelector("wx-alerts")) {
          const btn = document.getElementById("alerts-tab-button");
          if (btn) {
            btn.classList.remove("display-none");
          }
        }

        // Announce loaded (optional hook for screen readers)
        const text = `Loaded ${el.id || "component"}`;
        window.dispatchEvent(
          new CustomEvent("wx-announce", { detail: { text } }),
        );
      }
    } catch (e) {
      console.error("Failed to load partial:", src, e);
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLazyLoad);
} else {
  initLazyLoad();
}
