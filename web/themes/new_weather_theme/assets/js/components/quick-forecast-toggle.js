// Add toggle capability to buttons that appear at the top
// of a daily forecast list item in non-desktop views
const clickHandler = (event) => {
  event.preventDefault();
  event.stopPropagation();
  console.log(event);
  const isExpanded = event.currentTarget.getAttribute("data-expanded") === "true";
  event.currentTarget.setAttribute("data-expanded", !isExpanded);
  Array.from(
    event.currentTarget.querySelectorAll(".wx-toggler-add-icon use")
  ).forEach(element => {
    const iconName = isExpanded ? "add_circle" : "remove_circle";
    const iconHref = element.getAttribute("xlink:href").split("#")[0];
    element.setAttributeNS(
      "http://www.w3.org/1999/xlink",
      "xlink:href",
      `${iconHref}#${iconName}`,
    );
  });
};

Array.from(
  document.querySelectorAll(".wx-daily-forecast-quick-toggle")
).forEach(element => {
  element.addEventListener("click", clickHandler);
});
