import getAlerts from "./alerts/index.js";
import getForecast from "./forecast/index.js";
import getObservations from "./obs/index.js";
import getPoint from "./points.js";

export const getDataForPoint = async (lat, lon) => {
  const { point, place, grid } = await getPoint(lat, lon);

  const [forecast, observed] = await Promise.all([
    getForecast({ grid }),
    getObservations({ grid, point }),
  ]);

  Object.assign(grid, forecast.gridData);
  delete forecast.gridData;

  const alerts = await getAlerts({ grid, point });

  if (forecast.daily.elevation) {
    grid.elevation = forecast.daily.elevation;
    delete forecast.daily.elevation;
  }

  return {
    alerts,
    observed,
    point,
    place,
    grid,
    forecast,
  };
};

export default { getDataForPoint };
