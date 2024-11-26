// Add toggle capability to buttons that appear at the top
// of a daily forecast list item in non-desktop views
const clickHandler = (event) => {
  event.preventDefault();
  event.stopPropagation();
  // Depending on a tap, click, or keyboard selection of the h3/button,
  // the target of the click event can change.
  // We check to see which of the elements is the target
  const targetIsButton = event.target.matches("button");
  let button;
  let h3;
  if(targetIsButton){
    button = event.target;
    h3 = button.parentElement;
  } else {
    button = event.target.querySelector("button");
    h3 = event.target;
  }
  const isExpanded = h3.getAttribute("data-expanded") === "true";
  h3.setAttribute("data-expanded", !isExpanded);
  button.setAttribute("aria-expanded", !isExpanded);
  Array.from(
    h3.querySelectorAll(".wx-toggler-add-icon use")
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
