// Add toggle capability to buttons that appear at the top
// of a daily forecast list item in non-desktop views
const clickHandler = (event) => {
  event.preventDefault();
  const isExpanded = event.currentTarget.getAttribute("aria-expanded") === "true";
  event.currentTarget.setAttribute("aria-expanded", !isExpanded);
};

Array.from(
  document.querySelectorAll(".wx-daily-forecast-quick-toggle")
).forEach(element => {
  element.addEventListener("click", clickHandler);
});
