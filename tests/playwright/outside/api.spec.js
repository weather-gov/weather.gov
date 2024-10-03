const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const { describe } = test;

const API_ENDPOINT = "http://localhost:9080/jsonapi";

// helper function to upload files to the JSON API
const uploadFile = async (request, where, filename) => {
  const binaryData = await fs.readFileSync(
    path.resolve(__dirname, "..", "mock-data", filename),
  );
  return await request.post(where,
    {
      headers: {
        Authorization: `Basic ${btoa("uploader:testpass")}`,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `file; filename="${filename}"`,
      },
      data: binaryData,
    },
  );
};

// helper function to upload content types to the JSON API
const uploadContentType = async (request, where, data) => {
  return await request.post(where,
    {
      headers: {
        Authorization: `Basic ${btoa("uploader:testpass")}`,
        "Content-Type": "application/vnd.api+json",
      },
      data,
    },
  );
};

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

  test("uploader can upload wfo pdfs", async ({ request }) => {
    // step one: upload the PDF
    const pdfFilename = "test-upload.pdf";
    const uploadLocation = `${API_ENDPOINT}/node/wfo_pdf_upload/field_wfo_sitrep`;
    const firstResponse = await uploadFile(request, uploadLocation, pdfFilename);
    expect(firstResponse.status()).toEqual(201);
    const firstJson = await firstResponse.json();
    expect(firstJson).toHaveProperty("data");
    expect(firstJson.data).toHaveProperty("id");
    expect(firstJson.data).toHaveProperty("attributes");
    const { id } = firstJson.data;

    // step two: upload the content type data
    const contentLocation = `${API_ENDPOINT}/node/wfo_pdf_upload`;
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
              id,
            },
          },
        },
      },
    };
    const secondResponse = await uploadContentType(request, contentLocation, data);
    expect(secondResponse.status()).toEqual(201);
    const secondJson = await secondResponse.json();
    expect(secondJson).not.toHaveProperty("errors");
    expect(secondJson).toHaveProperty("data");
  });

  test("uploader can upload wfo weather story images", async ({ request }) => {
    // step one: upload the image
    const pngFilename = "test-upload.png";
    const uploadLocation = `${API_ENDPOINT}/node/wfo_weather_story_upload/field_fullimage`;
    const firstResponse = await uploadFile(request, uploadLocation, pngFilename);
    expect(firstResponse.status()).toEqual(201);
    const firstJson = await firstResponse.json();
    expect(firstJson).toHaveProperty("data");
    expect(firstJson.data).toHaveProperty("id");
    expect(firstJson.data).toHaveProperty("attributes");
    const { id } = firstJson.data;

    // step two: upload the metadata (only these that are required attributes)
    const contentLocation = `${API_ENDPOINT}/node/wfo_weather_story_upload`;
    const data = {
      data: {
        type: "node--wfo_weather_story_upload",
        attributes: {
          title: pngFilename,
          field_title: "weather story",
          field_office: "WFO test office",
          field_description: "a blank uploaded image",
        },
        relationships: {
          field_fullimage: {
            data: {
              type: "file--file",
              id,
            },
          },
        },
      },
    };
    const secondResponse = await uploadContentType(request, contentLocation, data);
    expect(secondResponse.status()).toEqual(201);
    const secondJson = await secondResponse.json();
    expect(secondJson).not.toHaveProperty("errors");
    expect(secondJson).toHaveProperty("data");
  });
});
