import { logger } from "../../util/monitoring/index.js";
import openDatabase from "../db.js";

const riskOverviewLogger = logger.child({ subsystem: "risk overview" });

/**
 *
 * @param {string} placeId 5-digit FIPS code for a county, or 2-letter state abbreviation
 * @returns Risk overview information.
 */
export const getRiskOverview = async (placeId) => {
  try {
    const db = await openDatabase();
    const data = await db.query(
      "SELECT data FROM weathergov_risk_data WHERE id=$1::text",
      [placeId.toUpperCase()],
    );

    if (data.rows.length) {
      return data.rows[0].data;
    }
    return { error: `No risk overview found for ${placeId}`, status: 404 };
  } catch (e) {
    riskOverviewLogger.error({ err: e, placeId }, "could not fetch");
    return { error: `Error fetching risk overview for ${placeId}` };
  }
};
