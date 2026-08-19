import "./combobox/listbox.js";

export function navigateToElement(combobox) {
  const popup = combobox.querySelector('[slot="popup"]');
  const selected = popup && popup.selection;
  const targetUrl = selected && selected.getAttribute("data-value");

  if (targetUrl) {
    window.location.href = targetUrl;
  }
}

// Make navigateToElement available globally for inline onchange handler
window.navigateToElement = navigateToElement;

document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".section-content h2[id]");
  const navLinks = document.querySelectorAll(".usa-sidenav__item a");

  const observerOptions = {
    root: null, // Uses the browser viewport
    rootMargin: "0px 0px -90% 0px", // Triggers when section hits the upper-middle screen
    threshold: 0,
  };

  const observerCallback = (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute("id");

        // Remove active class from all links
        navLinks.forEach((link) => link.classList.remove("usa-current"));

        // Add active class to matching link
        const activeLink = document.querySelector(
          `.usa-sidenav__item a[href="#${id}"]`,
        );
        if (activeLink) {
          activeLink.classList.add("usa-current");
        }
      }
    });
  };

  // Set the first link as active on page load
  if (navLinks.length > 0) {
    navLinks[0].classList.add("usa-current");
  }

  const observer = new IntersectionObserver(observerCallback, observerOptions);
  sections.forEach((section) => observer.observe(section));
});
