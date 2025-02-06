(() => {
  const hideNavigationLoader = () => {
    const loader = document.querySelector("wx-loader");
    if (loader) {
      loader.classList.add("display-none");
    }
  };

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

  /**
   * If there is a navigation loader available on the page,
   * make sure that it is being displayed
   */
  const displayNavigationLoader = () => {
    const loader = document.querySelector("wx-loader");
    if (loader) {
      loader.classList.remove("display-none");
    }
  };

  const goToLocationPage = (latitude, longitude) => {
    // Submit the form, so we get the same behavior regardless of how we end up
    // navigating to the location page.
    const form = document.querySelector("form[data-location-search]");
    form.setAttribute("action", `/point/${latitude}/${longitude}`);

    form.submit();
  };

  const setupBrowserGeolocation = async () => {
    const button = document.querySelector(
      "button#weathergov-use-browser-location",
    );

    // If the browser does not support the geolocation API, just bail out. Take
    // the "use my location" button away too. Also bop out if we don't have a
    // button for some reason. Just being safe.
    if (!button || !navigator.geolocation) {
      button?.parentElement?.previousElementSibling.remove();
      button?.parentElement?.remove();

      return;
    }

    // Whether we should independently prompt the user prior to asking the browser
    // for their location. IF we can detect existing permissions AND the user has
    // not already granted or denied us, THEN we should prompt first. If we can't
    // detect existing permissions, don't prompt because otherwise we end up
    // putting up our prompt for that user every time they try to use their
    // location.
    let shouldPrompt = false;

    if (navigator.permissions) {
      try {
        // Query for geolocation permissions.
        const status = await navigator.permissions.query({
          name: "geolocation",
        });

        // If the user has already denied location, we can go ahead and bail out.
        // Changing browser settings is not detectable within the page, so they'll
        // have to reload to get the option back anyway.
        //
        // Might need to reconsider this. It might be preferable to leave the
        // button and show users a popup. There are several reasons we might get
        // the "denied" state:
        //
        // 1. The web browser does not have permission from the operating system.
        // 2. The web browser is configured to deny permission by default.
        // 3. The user has denied access to our site in particular.
        //
        // In cases 1 and 2, users may not be aware of their settings. If we show
        // the button and then popup a message when they click it letting them
        // know they need to change their browser settings, maybe that's useful.
        // The immediate drawback I can think of is we have no way of knowing
        // whether it's a browser setting or an operating system setting, so we
        // can't give them any more helpful advice than "check your settings."
        //
        // In case 3, however, we should just leave the user alone. They have
        // already said no, and that should be the end of it.
        //
        // Key important takeaway, though, is that "denied" means all of those
        // things and it is impossible for us to know which.
        if (status.state === "denied") {
          button.parentElement.previousElementSibling.remove();
          button.parentElement.remove();
          return;
        }

        // If the user has not denied us permission, then we should show our own
        // prompt if the user has not yet granted us permission.
        shouldPrompt = status.state === "prompt";
      } catch (_) {
        // An exception in the permissions API likely indicates that the specific
        // attribute we queried for isn't available. That doesn't mean the feature
        // doesn't exist, though, so we should continue as if the permissions API
        // doesn't exist at all and not use our prompt.
      }
    }

    button.addEventListener("click", async () => {
      let proceed = true;

      // If location is available and we know that the user has neither denied or
      // granted us permission to use it, we will let them know before asking for
      // it. It's kind of a double-opt-in.
      if (shouldPrompt) {
        // Not sure why eslint doesn't want us to use confirm(). This seems like
        // exactly what it exists for.
        // eslint-disable-next-line no-alert
        proceed = window.confirm(
          "We will now ask your browser to provide your location. If you approve, you will not be asked again. Your location information is only used to find your forecast.",
        );
      }

      // If we don't know about the permission, we were already approved to use
      // it, or the user has signaled that we can ask for it... ask for it!
      if (proceed) {
        // Show the loader animation, if available
        displayNavigationLoader();

        navigator.geolocation.getCurrentPosition(
          // Success callback
          ({ coords: { latitude, longitude } }) => {
            // Scale down the precision on these.
            const lat = Math.round(latitude * 1_000) / 1_000;
            const long = Math.round(longitude * 1_000) / 1_000;

            // And navigate away!
            goToLocationPage(lat, long);
          },
          // Error callback
          ({ code, message }) => {
            if (code > 1) {
              // There was a problem getting the user's location. They allowed it,
              // but the browser gave us an error.
              // (Error code 1 is for when the user denies access to location, so
              // for our purposes, that is not an error.)

              // eslint-disable-next-line no-alert
              alert(
                `There was a problem getting your location. Here's what your browser told us: ${message}`,
              );
            }
          },
        );
      }
    });
  };
  setupBrowserGeolocation();
})();
