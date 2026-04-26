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

        const tabContainer = el.closest(".wx-tab-container");
        if (tabContainer && tabContainer.id) {
          if (tabContainer.id === "alerts") {
            const badge = document.querySelector("#alerts-tab-button .alerts-badge");
            if (badge) {
              const count = el.querySelectorAll(".usa-accordion").length;
              if (count > 0) {
                badge.textContent = count;
                badge.classList.remove("display-none");
              }
            }
          }

          document.dispatchEvent(
            new CustomEvent("wx:partial-loaded", { detail: { tabId: tabContainer.id } }),
          );
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
