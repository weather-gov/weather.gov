import { getProductById } from "../data/index.js";

export const method = "GET";
export const url = "/products/:id";
export const schema = {
  params: {
    type: "object",
    properties: {
      id: {
        type: "string",
        pattern:
          "^[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}$",
      },
    },
  },
};

export const handler = async (request) => {
  const id = request.params.id;

  const data = await getProductById(id);

  if (data.error) {
    return { data, error: data.detail, status: data.status };
  }

  return { data };
};
