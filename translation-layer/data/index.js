import getAlerts from "./alerts/index.js";
import getForecast from "./forecast/index.js";
import getObservations from "./obs/index.js";
import getPoint from "./points.js";
import getSatellite from "./satellite.js";

export const getDataForPoint = async (lat, lon) => {
  const { point, place, grid } = await getPoint(lat, lon);

  const satellitePromise = getSatellite({ grid });

  const [forecast, observed] = await Promise.all([
    getForecast({ grid }),
    getObservations({ grid, point }),
  ]);

  Object.assign(grid, forecast.gridData);
  delete forecast.gridData;

  const alerts = await getAlerts({ grid, point, place });

  if (forecast.daily.elevation) {
    grid.elevation = forecast.daily.elevation;
    delete forecast.daily.elevation;
  }

  const satellite = await satellitePromise;

  return {
    alerts,
    observed,
    point,
    place,
    grid,
    forecast: forecast.daily,
    satellite,
  };
};

export default { getDataForPoint };
