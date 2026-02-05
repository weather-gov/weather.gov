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

  connectedCallback() {
    this.video = this.getElementsByTagName("video")?.item(0);

    if (this.video) {
      this.video.addEventListener("play", this.handlePlay);
      this.video.addEventListener("pause", this.handlePause);
      this.video.addEventListener("ended", this.handleEnded);
    }
  }

  disonnectedCallback() {
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
