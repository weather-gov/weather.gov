document.addEventListener("DOMContentLoaded", () => {
  // Find all tab content elements that have the htmx
  // attributes. Make the htmx request and swap out
  // the markup for that tab.
  Array.from(document.querySelectorAll(".wx-tab-container[hx-get]")).forEach(
    async (swapEl) => {
      const url = swapEl.getAttribute("hx-get");
      const errorTargetSelector = swapEl.getAttribute("hx-error-target");
      const method = swapEl.getAttribute("hx-swap");
      const headers = {
        "HX-Request": "true",
        "HX-Target": swapEl.id,
      };
      const response = await fetch(url, { method: "GET", headers });
      if (response.ok) {
        const markup = await response.text();
        swapEl[method] = markup;
        document.dispatchEvent(
          new CustomEvent("wx:tab-content-loaded", {
            detail: { tabId: swapEl.id },
          }),
        );
      } else if (errorTargetSelector) {
        // We have encountered some kind of error.
        // Find the error template element on the page and
        // swap it out
        // const errorTarget = document.getElementById(errorTargetId);
        const errorTarget = swapEl.querySelector(errorTargetSelector);
        if (errorTarget) {
          swapEl[method] = errorTarget.innerHTML;
        }
      }
    },
  );
});
