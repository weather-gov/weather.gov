import { getGHWOData } from "../data/ghwo/index.js";

export const method = "GET";
export const url = "/ghwo/:id";
export const schema = {
  params: {
    id: {
      type: "string",
      pattern: "^([0-9]{5}|[A-Za-z]{2})$",
    },
  },
};

export const handler = async (request) => {
  const { id } = request.params;

  const ghwo = await getGHWOData(id);

  if (ghwo.error) {
    return {
      status: ghwo.status ?? 500,
      data: { error: ghwo.error },
      error: ghwo.error,
    };
  }

  return { data: ghwo.data };
};
