import { getGHWOForWFOAndCounty } from "../data/ghwo.js";

export const method = "GET";
export const url = "/ghwo/:wfo/:county";
export const schema = {
  params: {
    wfo: {
      type: "string",
      pattern: "^[A-Za-z]{3}$",
    },
    county: {
      type: "string",
      pattern: "^[0-9]{5}$",
    },
  },
};

export const handler = async (request) => {
  const { wfo, county } = request.params;

  const ghwo = await getGHWOForWFOAndCounty(wfo, county);

  if (ghwo.error) {
    return {
      status: ghwo.status ?? 500,
      data: { error: ghwo.error },
      error: ghwo.error,
    };
  }

  return { data: ghwo.data };
};
