const setupWorker = () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("worker.js", {
      scope: "/",
      type: "module",
    });

    let apiHitCount = 0;
    let bytes = 0;
    let time = 0;

    const round = new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    });

    const byteFormat = new Intl.NumberFormat("en-US");

    const counter = document.getElementById("api_counter");
    navigator.serviceWorker.addEventListener("message", (event) => {
      switch (event.data.type) {
        case "api_hit":
          apiHitCount += 1;
          bytes += event.data.size;
          time += event.data.time;
          counter.innerHTML = `${apiHitCount} calls to api.weather.gov<br>${byteFormat.format(
            bytes
          )} bytes<br>${round.format(time)} milliseconds`;
          break;
        default:
          break;
      }
    });
  }
};

export default setupWorker;
