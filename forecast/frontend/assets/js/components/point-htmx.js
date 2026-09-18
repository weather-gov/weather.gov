document.addEventListener("DOMContentLoaded", () => {
  // Find all tab content elements that have the htmx
  // attributes. Make the htmx request and swap out
  // the markup for that tab.
  Array.from(document.querySelectorAll(".wx-tab-container[hx-get]")).forEach(
    async (swapEl) => {
      const url = swapEl.getAttribute("hx-get");
      const headers = {
        "HX-Request": "true",
        "HX-Target": swapEl.id,
      };
      const response = await fetch(url, { method: "GET", headers });
      if (response.ok) {
        const markup = await response.text();
        const method = swapEl.getAttribute("hx-swap");
        swapEl[method] = markup;
      }
    },
  );
});
