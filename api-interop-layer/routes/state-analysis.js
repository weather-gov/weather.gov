import { getBriefingsForWFOs } from "../data/briefing.js";

export const method = "GET";
export const url = "/state/analysis";
export const schema = {
  querystring: {
    type: "object",
    properties: {
      wfos: {
        type: "array",
        items: {
          type: "string",
          pattern: "^[A-Z]{3}$",
        },
      },
    },
  },
};

export const handler = async (request) => {
  const { wfos } = request.query;

  const briefings = await getBriefingsForWFOs(wfos);

  return {
    data: {
      briefings,
    },
  };
};
