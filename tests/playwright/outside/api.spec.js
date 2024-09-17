const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const { describe } = test;

const API_ENDPOINT = "http://localhost:9080/jsonapi";

describe("API tests", () => {
  test("users without credentials cannot get an API listing", async ({
    request,
  }) => {
    const response = await request.get(API_ENDPOINT);
    expect(response.ok()).not.toBeTruthy();
    const json = await response.json();
    expect(json).toHaveProperty("errors");
    expect(json).toMatchObject({
      errors: [
        {
          detail: "No authentication credentials provided.",
          title: "Unauthorized",
          status: "401",
        },
      ],
    });
  });

  test("anonymous users cannot get an API listing", async ({ request }) => {
    const response = await request.get(API_ENDPOINT, {
      headers: {
        Authorization: `Basic ${btoa("foo:foo")}`,
      },
    });
    expect(response.ok()).not.toBeTruthy();
    const json = await response.json();
    expect(json).toHaveProperty("errors");
    expect(json).toMatchObject({
      errors: [
        {
          title: "Forbidden",
          status: "403",
        },
      ],
    });
  });

  test("uploader can see the API listing", async ({ request }) => {
    const response = await request.get(API_ENDPOINT, {
      headers: {
        Authorization: `Basic ${btoa("uploader:testpass")}`,
      },
    });
    expect(response.ok()).toBeTruthy();
    const json = await response.json();
    expect(json).not.toHaveProperty("errors");
  });

  test("uploader can upload files", async ({ request }) => {
    // step one: upload the PDF
    const pdf_filename = "test-upload.pdf";
    const binary_data = await fs.readFileSync(
      path.resolve(__dirname, "..", "mock-data", pdf_filename),
    );
    const first_response = await request.post(
      `${API_ENDPOINT}/node/wfo_pdf_upload/field_wfo_sitrep`,
      {
        headers: {
          Authorization: `Basic ${btoa("uploader:testpass")}`,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `file; filename="${pdf_filename}"`,
        },
        data: binary_data,
      },
    );
    expect(first_response.status()).toEqual(201);
    const first_json = await first_response.json();
    expect(first_json).toHaveProperty("data");
    expect(first_json["data"]).toHaveProperty("id");
    expect(first_json["data"]).toHaveProperty("attributes");
    const id = first_json["data"]["id"];

    // step two: upload the metadata
    const data = {
      data: {
        type: "node--wfo_pdf_upload",
        attributes: {
          title: pdf_filename,
        },
        relationships: {
          field_wfo_sitrep: {
            data: {
              type: "file--file",
              id: id,
            },
          },
        },
      },
    };
    const second_response = await request.post(
      `${API_ENDPOINT}/node/wfo_pdf_upload`,
      {
        headers: {
          Authorization: `Basic ${btoa("uploader:testpass")}`,
          "Content-Type": "application/vnd.api+json",
        },
        data,
      },
    );
    expect(second_response.status()).toEqual(201);
    const second_json = await second_response.json();
    expect(second_json).not.toHaveProperty("errors");
    expect(second_json).toHaveProperty("data");
  });
});
