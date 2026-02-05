export const update = async () => {
  const url = URL.parse(window.location.href);
  url.searchParams.append("update", "");
  const page = await fetch(url.toString()).then((response) => response.text());
  const container = document.createElement("div");
  container.innerHTML = page;

  const itemsToUpdate = document.querySelectorAll("[wx-auto-update]");
  itemsToUpdate.forEach((node) => {
    const target = node.getAttribute("wx-auto-update");
    const updated = container.querySelector(`[wx-auto-update="${target}"]`);
    if (updated) {
      node.innerHTML = updated.innerHTML;
    }
  });
};

const start = () => {
  // Update components every 5 minutes. For now, this is to keep it in sync with
  // CMI, which also updates every 5 minutes.
  setInterval(update, 300_000);
};

document.addEventListener("DOMContentLoaded", start);
