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
    const pdfFilename = "test-upload.pdf";
    const binaryData = await fs.readFileSync(
      path.resolve(__dirname, "..", "mock-data", pdfFilename),
    );
    const firstResponse = await request.post(
      `${API_ENDPOINT}/node/wfo_pdf_upload/field_wfo_sitrep`,
      {
        headers: {
          Authorization: `Basic ${btoa("uploader:testpass")}`,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `file; filename="${pdfFilename}"`,
        },
        data: binaryData,
      },
    );
    expect(firstResponse.status()).toEqual(201);
    const firstJson = await firstResponse.json();
    expect(firstJson).toHaveProperty("data");
    expect(firstJson["data"]).toHaveProperty("id");
    expect(firstJson["data"]).toHaveProperty("attributes");
    const id = firstJson["data"]["id"];

    // step two: upload the metadata
    const data = {
      data: {
        type: "node--wfo_pdf_upload",
        attributes: {
          title: pdfFilename,
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
    const secondResponse = await request.post(
      `${API_ENDPOINT}/node/wfo_pdf_upload`,
      {
        headers: {
          Authorization: `Basic ${btoa("uploader:testpass")}`,
          "Content-Type": "application/vnd.api+json",
        },
        data,
      },
    );
    expect(secondResponse.status()).toEqual(201);
    const secondJson = await secondResponse.json();
    expect(secondJson).not.toHaveProperty("errors");
    expect(secondJson).toHaveProperty("data");
  });
});
