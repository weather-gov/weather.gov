import { getDataForWxStory } from "../data/weatherstory.js";

export const method = "GET";

export const url = "/offices/:wfo/weatherstories";

export const schema = {
  params: {
    type: "object",
    properties: {
      wfo: {
        type: "string",
        pattern: "^[A-Z]{3}$",
      },
    },
  },
};

export const handler = async (request) => {
  const { wfo } = request.params;
  const data = await getDataForWxStory(wfo);

  if (data.error) {
    return { data, status: data.status, error: data.error };
  }
  return { data };
};
