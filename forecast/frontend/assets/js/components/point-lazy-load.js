document.addEventListener("DOMContentLoaded", () => {
  const elements = document.querySelectorAll("[wx-lazy-load]");
  elements.forEach(async (el) => {
    const src = el.getAttribute("wx-lazy-load");
    if (!src) return;

    try {
      const response = await fetch(src);
      if (response.ok) {
        const html = await response.text();
        el.innerHTML = html;

        // Execute any script tags injected
        const scripts = el.querySelectorAll("script");
        scripts.forEach((oldScript) => {
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes).forEach((attr) =>
            newScript.setAttribute(attr.name, attr.value),
          );
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode.replaceChild(newScript, oldScript);
        });

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
});
