/** @file this is for the events to show and hide the wx-loader */

const hideNavigationLoader = () => {
  document.querySelectorAll("wx-loader").forEach((loader) => {
    loader.setAttribute("aria-hidden", true);
  });
};

/**
 * If there is a navigation loader available on the page,
 * make sure that it is being displayed.
 * 
 * Each loader is supposed to have a `loader-for` attribute
 * with one or more unique identifiers. Pick the desired loader
 * by passing the ID when emitting the event.
 */
const showNavigationLoader = (event) => {
  const loaders = document.querySelectorAll("wx-loader");
  const activeNav = event.detail?.id;

  loaders.forEach((loader) => {
    const loaderIsFor = (loader.getAttribute("loader-for") || "").split(" ");
    if (loaderIsFor.includes(activeNav)) {
      loader.removeAttribute("aria-hidden");
    }
  });
  if (loaders.length) {
    const text = gettext("js.loader.loading-text.01");
    window.dispatchEvent(
      new CustomEvent("wx-announce", { detail: { text } }),
    );
  }
};

window.addEventListener("wx-hide-navigation-loader", hideNavigationLoader);
window.addEventListener("wx-show-navigation-loader", showNavigationLoader);

// When the page is shown, hide the navigation loader. This is the best we can
// do to handle hiding it when the back button is clicked. This code is not
// (necessarily) executed again when the back button is pressed. Instead, its
// state may simply be popped from the history stack. The pageshow event is
// fired any time this page is shown, regardless of source, and our event
// listener would persist as part of the popped state. The downside is there's
// a flash of the loader before it gets hidden.
//
// In the event that the browser has already unloaded this page's state from
// the history stack (to recoup memory, for example), then the page will
// reload entirely. In that case, the loader is already hidden.
window.addEventListener("pageshow", hideNavigationLoader);
