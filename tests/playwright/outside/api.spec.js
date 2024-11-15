const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const { describe } = test;

const API_ENDPOINT = "http://localhost:9080/jsonapi";

// helper function to upload files to the JSON API
const uploadFile = async (request, where, filename) => {
  const binaryData = fs.readFileSync(
    path.resolve(__dirname, "..", "mock-data", filename),
  );
  return request.post(where,
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
const uploadContentType = async (request, where, data) => request.post(where,
  {
    headers: {
      Authorization: `Basic ${btoa("uploader:testpass")}`,
      "Content-Type": "application/vnd.api+json",
    },
    data,
  },
);

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
    // verify that `weather_cms_entity_presave` could not derive the WFO due to
    // insufficient information.
    expect(secondJson.data).toHaveProperty('attributes');
    expect(secondJson.data.attributes).toHaveProperty('field_derived_wfo');
    expect(secondJson.data.attributes.field_derived_wfo).toEqual('unknown');
  });

  test("uploader cannot upload wfo weather story images with missing attributes", async ({ request }) => {
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

    // step two: upload the metadata with missing attributes
    const contentLocation = `${API_ENDPOINT}/node/wfo_weather_story_upload`;
    const data = {
      data: {
        type: "node--wfo_weather_story_upload",
        attributes: {
          title: pngFilename,
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
    expect(secondResponse.status()).toEqual(422);
  });

  const uploadWeatherStoryWithAttributes = async (request, attributes) => {
    // step one: upload the first image
    const pngFilename = "test-upload.png";
    const uploadFullLocation = `${API_ENDPOINT}/node/wfo_weather_story_upload/field_fullimage`;
    const firstFullResponse = await uploadFile(request, uploadFullLocation, pngFilename);
    expect(firstFullResponse.status()).toEqual(201);
    const firstFullJson = await firstFullResponse.json();
    expect(firstFullJson).toHaveProperty("data");
    expect(firstFullJson.data).toHaveProperty("id");
    expect(firstFullJson.data).toHaveProperty("attributes");
    const { id: firstId } = firstFullJson.data;

    // step one: upload the second image
    const uploadSmallLocation = `${API_ENDPOINT}/node/wfo_weather_story_upload/field_smallimage`;
    const firstSmallResponse = await uploadFile(request, uploadSmallLocation, pngFilename);
    expect(firstSmallResponse.status()).toEqual(201);
    const firstSmallJson = await firstSmallResponse.json();
    expect(firstSmallJson).toHaveProperty("data");
    expect(firstSmallJson.data).toHaveProperty("id");
    expect(firstSmallJson.data).toHaveProperty("attributes");
    const { id: secondId } = firstSmallJson.data;

    // step three: upload the metadata (all required attributes)
    const contentLocation = `${API_ENDPOINT}/node/wfo_weather_story_upload`;
    const data = {
      data: {
        type: "node--wfo_weather_story_upload",
        attributes: {
          title: pngFilename,
          field_office: "WFO test office",
          field_description: "a blank uploaded image",
          field_weburl: "",
          field_frontpage: true,
          field_graphicnumber: 1,
          field_order: 1,
          field_radar: 0,
          // lat/lon is real, this is from the FXC WFO
          field_cwa_center_lat: 36.3274502,
          field_cwa_center_lon: 119.6456844,
          field_starttime: 1726572420,
          field_endtime: 1726572420,
          ...attributes,
        },
        relationships: {
          field_fullimage: {
            data: {
              type: "file--file",
              id: firstId,
            },
          },
          field_smallimage: {
            data: {
              type: "file--file",
              id: secondId,
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
    return secondJson;
  };

  test("uploader can upload wfo weather story images with all attributes", async ({ request }) => {
    const json = await uploadWeatherStoryWithAttributes(request, {
      field_weburl: "/FXC/wxstory.php?wfo=afc",
    });
    // verify that `weather_cms_entity_presave` derived the WFO properly.
    expect(json.data).toHaveProperty('attributes');
    expect(json.data.attributes).toHaveProperty('field_derived_wfo');
    expect(json.data.attributes.field_derived_wfo).toEqual('AFC');
  });

  test("drupal can derive wfo weather.gov url", async ({ request }) => {
    const json = await uploadWeatherStoryWithAttributes(request, {
      field_weburl: "https://www.weather.gov/SJT/",
    });
    // verify that `weather_cms_entity_presave` derived the WFO properly.
    expect(json.data).toHaveProperty('attributes');
    expect(json.data.attributes).toHaveProperty('field_derived_wfo');
    expect(json.data.attributes.field_derived_wfo).toEqual('SJT');
  });

  test("drupal can derive wfo from relative WFO url", async ({ request }) => {
    const json = await uploadWeatherStoryWithAttributes(request, {
      field_weburl: "/grr/",
    });
    // verify that `weather_cms_entity_presave` derived the WFO properly.
    expect(json.data).toHaveProperty('attributes');
    expect(json.data.attributes).toHaveProperty('field_derived_wfo');
    expect(json.data.attributes.field_derived_wfo).toEqual('GRR');
  });

  test("drupal can derive wfo from radar url", async ({ request }) => {
    const json = await uploadWeatherStoryWithAttributes(request, {
      field_weburl: "http://radar.weather.gov/lzk/",
    });
    // verify that `weather_cms_entity_presave` derived the WFO properly.
    expect(json.data).toHaveProperty('attributes');
    expect(json.data.attributes).toHaveProperty('field_derived_wfo');
    expect(json.data.attributes.field_derived_wfo).toEqual('LZK');
  });

  test("drupal can derive wfo from srh.noaa.gov url", async ({ request }) => {
    const json = await uploadWeatherStoryWithAttributes(request, {
      field_weburl: "http://www.srh.noaa.gov/graphicast.php?site=jan&gc=8",
    });
    // verify that `weather_cms_entity_presave` derived the WFO properly.
    expect(json.data).toHaveProperty('attributes');
    expect(json.data.attributes).toHaveProperty('field_derived_wfo');
    expect(json.data.attributes.field_derived_wfo).toEqual('JAN');
  });
});
