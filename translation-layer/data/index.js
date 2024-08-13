import getAlerts from "./alerts/index.js";
import getForecast from "./forecast/index.js";
import getObservations from "./obs/index.js";
import getPoint from "./points.js";

export const getDataForPoint = async (lat, lon) => {
  const { point, place, grid } = await getPoint(lat, lon);

  const [forecast, obs] = await Promise.all([
    getForecast({ grid }),
    getObservations({ point }),
  ]);

  Object.assign(grid, forecast.gridData);
  delete forecast.gridData;

  const alerts = await getAlerts({ grid, point });

  return {
    alerts,
    obs,
    point,
    place,
    grid,
    forecast,
  };
};

export default { getDataForPoint };
