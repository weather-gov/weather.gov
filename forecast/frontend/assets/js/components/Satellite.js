class SatelliteVideo extends HTMLElement {
  constructor() {
    super();
    this.video = null;

    this.handlePlay = this.handlePlay.bind(this);
    this.handlePause = this.handlePause.bind(this);
    this.handleEnded = this.handleEnded.bind(this);
  }

  #state = {
    playing: false,
    discardPause: false,
    inLoopPause: false,
  };

  async connectedCallback() {
    this.loader = this.querySelector("[data-wx-satellite-loading]");
    this.content = this.querySelector("[data-wx-satellite-content]");
    this.error = this.querySelector("[data-wx-satellite-error]");
    this.video = this.querySelector("video");

    const wfo = this.getAttribute("wfo");
    const timezone = this.getAttribute("timezone");

    if (!wfo) return;

    try {
      const url = `https://cdn.star.nesdis.noaa.gov/WFO/catalogs/WFO_02_${wfo.toLowerCase()}_catalog.json`;
      const response = await fetch(url);
      const satelliteMetadata = await response.json();

      const satellite = satelliteMetadata?.meta?.satellite;
      if (satellite) {
        const goes = satellite === "GOES-West" ? "GOES18" : "GOES19";

        // Use observation_time and subtract 8 hours for the range
        const end = new Date(satelliteMetadata.meta.observation_time);
        const start = new Date(end.getTime() - 8 * 60 * 60 * 1000);

        const result = {
          times: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
          latest: `https://cdn.star.nesdis.noaa.gov/WFO/${wfo.toLowerCase()}/GEOCOLOR/latest.jpg`,
          gif: `https://cdn.star.nesdis.noaa.gov/WFO/${wfo.toLowerCase()}/GEOCOLOR/${goes}-${wfo.toUpperCase()}-GEOCOLOR-600x600.gif`,
          mp4: `https://cdn.star.nesdis.noaa.gov/WFO/${wfo.toLowerCase()}/GEOCOLOR/${goes}-${wfo.toUpperCase()}-GEOCOLOR-600x600.mp4`,
        };

        this.render(result, timezone);
      } else {
        this.renderError();
      }
    } catch (e) {
      console.error("Error getting satellite metadata", e);
      this.renderError();
    }
  }

  render(data, timezone) {
    const timeContainer = document.querySelector("[data-wx-satellite-times]");
    if (timeContainer) {
      const start = new Date(data.times.start);
      const end = new Date(data.times.end);

      const options = {
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone,
      };

      const dayOptions = {
        weekday: "long",
        ...options,
      };

      const startFormatted = new Intl.DateTimeFormat(
        undefined,
        dayOptions,
      ).format(start);
      let endFormatted = new Intl.DateTimeFormat(undefined, options).format(
        end,
      );

      const dayOnlyOptions = { day: "numeric", timeZone: timezone };
      const startDay = new Intl.DateTimeFormat(
        undefined,
        dayOnlyOptions,
      ).format(start);
      const endDay = new Intl.DateTimeFormat(undefined, dayOnlyOptions).format(
        end,
      );

      if (startDay !== endDay) {
        endFormatted = new Intl.DateTimeFormat(undefined, dayOptions).format(
          end,
        );
      }

      timeContainer.innerHTML = `<time datetime="${data.times.start}">${startFormatted}</time> – <time datetime="${data.times.end}">${endFormatted}</time>`;
    }

    if (this.video) {
      this.video.poster = data.latest;
      this.video.src = data.mp4;

      this.video.innerHTML = `
           <source src="${data.mp4}" type="video/mp4">
           <img src=${data.gif}>
      `;

      this.video.addEventListener("play", this.handlePlay);
      this.video.addEventListener("pause", this.handlePause);
      this.video.addEventListener("ended", this.handleEnded);
    }

    this.loader?.classList.add("display-none");
    this.content?.classList.remove("display-none");
  }

  renderError() {
    this.loader?.classList.add("display-none");
    this.content?.classList.add("display-none");
    this.error?.classList.remove("display-none");
  }

  disconnectedCallback() {
    if (this.video) {
      this.video.removeEventListener("play", this.handlePlay);
      this.video.removeEventListener("pause", this.handlePause);
      this.video.removeEventListener("ended", this.handleEnded);
    }
  }

  handlePlay() {
    // When the video starts playing, we want to capture that state ourselves.
    // We cannot rely on the video's internal state for our needs.
    this.#state.playing = true;
    this.#state.inLoopPause = false;
  }

  handlePause() {
    // If the video dispatched the ended event prior to dispatching the paused
    // event, we want to eat the pause event because it was caused by reaching
    // the end of the video, not a direct user action.
    //
    // However, the pause event usually comes before the ended event. So to
    // handle that, if we have not yet flagged that the pause should be
    // discarded, we wait a brief moment before changing our internal state.
    // That way, when the ended event handler runs, it can flag the pause 
    // to be discarded.
    if (!this.#state.discardPause) {
      setTimeout(() => {
        if (!this.#state.discardPause) {
          this.#state.playing = false;
        }
      }, 20);
    }
  }

  handleEnded() {
    // When we reach the end of the video, flag that the associated pause
    // should be discarded and that we are in the loop-pause.
    this.#state.discardPause = true;
    this.#state.inLoopPause = true;

    // But only hold that for a brief period of time. That way if the user
    // pauses the video themselves after this short delay, we will honor that.
    setTimeout(() => {
      this.#state.discardPause = false;
    }, 50);

    // Wait a few seconds. Then if the user has not paused the video or manually
    // resumed it, start it over from the beginning.
    setTimeout(() => {
      if (this.#state.playing && this.#state.inLoopPause) {
        this.#state.inLoopPause = false;
        this.video.currentTime = 0;
        this.video.play();
      }
    }, 500);
  }
}

if (!window.customElements.get("wx-satellite-video")) {
  window.customElements.define("wx-satellite-video", SatelliteVideo);
}
