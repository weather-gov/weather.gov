/** @file Code to show/hide a "scroll to top" button. */

const mobileButton = document.querySelector(".ride-up-button--mobile");
const tabletButton = document.querySelector(".ride-up-button--tablet");
const footerRegion = document.querySelector("footer");

const prefersReducedMotion = window.matchMedia?.(
  "(prefers-reduced-motion: reduce)",
)?.matches;

let scrollBracket = 0;
let bottomY = 0;
let hideThreshold = window.innerHeight * 1.75;
let minScrollThreshold = window.innerHeight * 1.5;
let protectedArea = false;

window.addEventListener("resize", () => {
  hideThreshold = window.innerHeight * 1.75;
  minScrollThreshold = window.innerHeight * 1.5;
});

window.addEventListener(
  "scroll",
  () => {
    // has the user scrolled more than 128 units?
    if (window.scrollY / 128 !== scrollBracket) {
      scrollBracket = window.scrollY >> 7;
      // never show the buttons in the top 200vh or when the user scrolls down
      if (window.scrollY < hideThreshold || window.scrollY > bottomY) {
        mobileButton.classList.remove("ride-up-button--visible");
        tabletButton.classList.remove("ride-up-button--visible");
        bottomY = window.scrollY;
      } else if (bottomY - window.scrollY > minScrollThreshold) {
        mobileButton.classList.add("ride-up-button--visible");
        tabletButton.classList.add("ride-up-button--visible");
        bottomY = window.scrollY;
      }
    }
  },
  { passive: true },
);

const scrollUp = () => {
  if (prefersReducedMotion) {
    window.scrollTo(0, 0);
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

mobileButton.addEventListener("click", scrollUp);
tabletButton.addEventListener("click", scrollUp);
