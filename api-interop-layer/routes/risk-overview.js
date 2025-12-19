import { getRiskOverview } from "../data/risk-overview/index.js";

export const method = "GET";
export const url = "/risk-overview/:placeId";
export const schema = {
  params: {
    placeId: {
      type: "string",
      pattern: "^([0-9]{5}|[A-Za-z]{2})$",
    },
  },
};

export const handler = async (request) => {
  const { placeId } = request.params;

  const riskOverview = await getRiskOverview(placeId);

  if (riskOverview.error) {
    return {
      status: riskOverview.status ?? 500,
      data: { error: riskOverview.error },
      error: riskOverview.error,
    };
  }

  return { data: riskOverview };
};
