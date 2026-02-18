import {
  drawChart,
  setupScrollButtons
} from "./WeatherChart.js";
import styles from "../styles.js";

const chartContainers = Array.from(
  document.querySelectorAll(".wx-hourly-wind-chart-container"),
);

/**
 * Dimensions for the wind direction arrow icon.
 * Each arrow is a 16x16 SVG rendered onto the chart canvas.
 */
const IMG_WIDTH = 16;
const IMG_HEIGHT = 16;
const IMG_HEIGHT_OFFSET = IMG_HEIGHT / 2;
const IMG_WIDTH_OFFSET = IMG_WIDTH / 2;

/**
 * Generate a data URI for a wind direction arrow SVG.
 * The arrow points in the direction the wind is blowing TO,
 * which is 180 degrees opposite from the meteorological convention
 * of reporting where wind blows FROM.
 *
 * @param {string} label - Unused, kept for API compatibility
 * @param {number} degrees - Wind direction in degrees (where wind blows FROM)
 * @param {string} color - Fill color for the arrow, defaults to dark gray
 * @returns {string} A data URI string containing the SVG markup
 */
const createArrowSVG = (label, degrees, color = "#3D4551") => {
  // We rotate the degrees by 180,
  // since the supplied angle represents where
  // the wind is blowing _from_
  const arrowDegrees = degrees + 180;
  const encodedColor = encodeURIComponent(color);
  return (
    "data:image/svg+xml;utf8," +
    `<svg width="${IMG_WIDTH}" height="${IMG_HEIGHT}" viewBox="0 0 ${IMG_WIDTH} ${IMG_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(${arrowDegrees}deg);transform-origin:center;">` +
    '<rect width="16" height="16" transform="translate(0.625)"/>' +
    `<path fill-rule="evenodd" clip-rule="evenodd" d="M2.96808 6.46448L4.38229 7.88059L7.625 4.63354L7.625 9.97052H9.625L9.625 4.63372L12.8676 7.88065L14.2818 6.46454L10.0391 2.21618L10.0391 2.21616L8.62493 0.800049L2.96808 6.46448ZM9.625 11.9705H7.625V14.9584H9.625V11.9705Z" fill="${encodedColor}"/>` +
    "</svg>"
  );
};

/**
 * Pre-load an arrow Image object and ensure it is fully decoded
 * before returning. This prevents the race condition where
 * ctx.drawImage() is called before the browser has finished
 * parsing the SVG data URI.
 *
 * @param {number} degrees - Wind direction in degrees
 * @param {string} color - Fill color for the arrow
 * @returns {Promise<Image>} A promise that resolves to a fully decoded Image
 */
const preloadArrowImage = (degrees, color) => {
  // Skip null/undefined degree values — the API can return null
  // for wind direction when data is unavailable
  if (degrees == null) {
    return Promise.resolve(null);
  }
  const img = new Image();
  img.src = createArrowSVG("", degrees, color);
  // img.decode() returns a promise that resolves once the image
  // data has been fully parsed and is ready for canvas rendering.
  // If decoding fails, we return null so the arrow is simply
  // skipped rather than crashing the entire chart.
  return img.decode().then(() => img).catch(() => null);
};

/**
 * Build a cache of pre-loaded arrow images for all wind directions
 * used by a given chart container. Each unique degree value gets
 * its own cached Image object, keyed by the degree number.
 *
 * @param {HTMLElement} container - The chart container DOM element
 *   with wind direction data stored in data attributes
 * @returns {Promise<Map<number, Image>>} A map from degree values
 *   to fully decoded Image objects
 */
const buildArrowImageCache = async (container) => {
  const directions = JSON.parse(container.dataset.windDirections);

  // Collect unique degree values so we only create one Image per direction
  const uniqueDegrees = [...new Set(directions.map((d) => d.degrees))];

  // Load all unique arrow images in parallel for efficiency
  const entries = await Promise.all(
    uniqueDegrees.map(async (degrees) => {
      const img = await preloadArrowImage(degrees, styles.colors.secondaryDarker);
      return [degrees, img];
    }),
  );

  return new Map(entries);
};

/**
 * Pull out all of the relevant wind information
 * from the data attributes on the element
 */
const getCombinedWindInfo = (element) => {
  const times = JSON.parse(element.dataset.times);
  const speeds = JSON.parse(element.dataset.windSpeeds);
  const directions = JSON.parse(element.dataset.windDirections);
  const gusts = JSON.parse(element.dataset.windGusts);

  return times.map((time, idx) =>
    Object.assign(
      {},
      {
        time,
        speed: speeds[idx],
        gusts: gusts[idx],
        direction: directions[idx],
      },
    ),
  );
};

/**
 * Create the afterDraw plugin function with access to
 * the pre-loaded arrow image cache. This closure pattern
 * ensures the cached images are available when Chart.js
 * calls the plugin hook.
 *
 * @param {Map<number, Image>} arrowCache - Map of degree values
 *   to pre-decoded Image objects
 * @returns {Function} A Chart.js afterDraw plugin function
 */
const createDrawWindInfoLabels = (arrowCache) => (chart) => {
  const ctx = chart.ctx;
  const xAxis = chart.scales.x;
  const yAxis = chart.scales.y;
  const container = chart.canvas.closest(".wx-hourly-wind-chart-container");
  const windInfo = getCombinedWindInfo(container);

  xAxis.ticks.forEach((val, idx) => {
    const x = xAxis.getPixelForTick(idx);
    const dataIndex = val.value;
    const degrees = windInfo[dataIndex].direction.degrees;

    // Look up the pre-loaded image from the cache instead of
    // creating a new Image() each time, which avoids the race
    // condition where drawImage runs before the SVG is decoded.
    // The image may be null if the degree value was null (missing
    // API data) or if decoding failed — skip drawing in that case.
    const img = arrowCache.get(degrees);
    if (!img) {
      return;
    }

    // Draw the arrow with rotation (rotation is baked into the SVG)
    const drawX = x;
    const drawY = yAxis.bottom + 40;
    ctx.save();
    ctx.drawImage(img, drawX - IMG_WIDTH_OFFSET, drawY - IMG_HEIGHT_OFFSET);
    ctx.restore();

    // Draw the cardinal direction text below the arrow
    const text = windInfo[dataIndex].direction.cardinalShort;
    ctx.save();
    const textMeasure = ctx.measureText(text);
    const textMarginRight = 2;
    const textX = drawX - textMeasure.width / 2 - textMarginRight;
    const textY = drawY + Math.max(img.height, img.width) + 8;
    ctx.fillStyle = styles.colors.secondaryDarker;
    ctx.font = "bold 16px DM Mono";
    ctx.fillText(text, textX, textY);
    ctx.restore();
  });
};

/**
 * Initialize each wind chart container. We pre-load all arrow
 * images first, then create the chart with the cached images
 * available to the afterDraw plugin. This ensures arrows render
 * correctly on the very first draw, not just after user interaction.
 */
for (const container of chartContainers) {
  const times = JSON.parse(container.dataset.times);
  const speeds = JSON.parse(container.dataset.windSpeeds);
  const gusts = JSON.parse(container.dataset.windGusts);

  // Pre-load all arrow images before creating the chart so they
  // are fully decoded and ready for canvas rendering on first draw.
  // If pre-loading fails entirely, fall back to an empty cache so
  // the chart still renders (arrows will just be missing, matching
  // the previous behavior before this fix).
  buildArrowImageCache(container)
  .catch(() => new Map())
  .then((arrowCache) => {
    const config = {
      type: "line",
      plugins: [
        {
          // Use the factory function to inject the pre-loaded
          // image cache into the afterDraw plugin
          afterDraw: createDrawWindInfoLabels(arrowCache),
        },
      ],

      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            events: ['click', 'mousemove', 'mouseout'],
          },
        },
        layout: {
          padding: {
            top: 24,
            bottom: 50,
          },
        },
        scales: {
          x: {
            ticks: {
              autoSkip: true,
              maxRotation: 0,
              color: styles.colors.base,
            },
            grid: {
              color: times.map((v) => {
                if (v === "12 AM") {
                  return "black";
                }

                const even = Number.parseInt(v, 10) % 2 === 0;
                if (even) {
                  return styles.colors.baseLighter;
                }
                return styles.colors.baseLightest;
              }),
            },
          },
          y: {
            min: 0,
            max: Math.max(
              Math.round(Math.max(...speeds) / 10) * 10 + 10,
              Math.round(Math.max(...gusts) / 10) * 10 + 10,
            ),
            ticks: {
              autoSkip: true,
              color: styles.colors.base,
              maxTicksLimit: 6,
              callback: (v) => `${v} mph`,
            },
          },
        },
      },

      data: {
        labels: times,
        datasets: [
          {
            label: "Speed",
            data: speeds,
            datalabels: {
              align: ({ dataIndex }) =>
                speeds[dataIndex] >= gusts[dataIndex] ? "top" : "bottom",
              color: styles.colors.primaryDark,
            },
            backgroundColor: styles.colors.secondaryDarker,
            borderColor: styles.colors.secondaryDarker,
            borderWidth: 1.5,
          },
          {
            label: "Gusts",
            data: gusts,
            datalabels: {
              align: ({ dataIndex }) =>
                speeds[dataIndex] >= gusts[dataIndex] ? "bottom" : "top",
              color: styles.colors.primary,
              display: ({ dataIndex }) => speeds[dataIndex] !== gusts[dataIndex],
            },
            borderDash: [4],
            backgroundColor: styles.colors.secondary,
            borderColor: styles.colors.secondary,
            borderWidth: 1.5,
          },
        ],
      },
    };

    drawChart(container, config);
    setupScrollButtons(container);
  });
}
