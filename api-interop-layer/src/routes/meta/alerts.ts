import { rest } from "../../data/alerts/kinds.js";

export const method = "GET";
export const url = "/meta/alerts";
export const schema = {};

export const handler = async () => {
  const data = await rest();
  return { data };
};
