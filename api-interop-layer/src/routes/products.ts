import { getProductById } from "../data/index.js";

export const method = "GET";
export const url = "/products/:id";
export const schema = {
  params: {
    type: "object",
    properties: {
      id: {
        type: "string",
      },
    },
  },
};

export const handler = async (request: any) => {
  const id = request.params.id;

  const data = await getProductById(id);

  if (data.error) {
    return { data, error: data.detail, status: data.status };
  }

  return { data };
};
