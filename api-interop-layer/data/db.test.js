import { expect } from "chai";
import { getDatabaseConnectionInfo } from "./db.js";

describe("database utility", () => {
  it("defaults to hardcoded connection details", () => {
    delete process.env.DB_USERNAME;
    delete process.env.DB_PASSWORD;
    delete process.env.DB_NAME;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.API_DB_MAX_CONNECTIONS;

    const actual = getDatabaseConnectionInfo();

    expect(actual).to.eql({
      user: "drupal",
      password: "drupal",
      database: "weathergov",
      host: "database",
      port: 3306,
      min: 22,
      max: 45,
    });
  });

  it("uses environment variables if set and not in production", () => {
    process.env.DB_USERNAME = "Link";
    process.env.DB_PASSWORD = "It's a secret to everybody.";
    process.env.DB_NAME = "Triforce";
    process.env.DB_HOST = "Hyrule";
    process.env.DB_PORT = "Zora's Domain";
    process.env.API_DB_MAX_CONNECTIONS = "100";

    const actual = getDatabaseConnectionInfo();

    expect(actual).to.eql({
      user: "Link",
      password: "It's a secret to everybody.",
      database: "Triforce",
      host: "Hyrule",
      port: "Zora's Domain",
      min: 50,
      max: 100,
    });
  });

  it("uses VCAP data if in production", () => {
    delete process.env.API_DB_MAX_CONNECTIONS;

    process.env.API_INTEROP_PRODUCTION = "true";
    process.env.VCAP_SERVICES = JSON.stringify({
      "aws-rds": [
        {
          credentials: {
            username: "cloudy bunch",
            password: "carlo in particular",
            name: "postgres",
            host: "somewhere in an AWS datacenter",
            port: "any, in a storm",
            min: 20,
            max: 40,
          },
        },
      ],
    });

    const actual = getDatabaseConnectionInfo();

    expect(actual).to.eql({
      user: "cloudy bunch",
      password: "carlo in particular",
      database: "postgres",
      host: "somewhere in an AWS datacenter",
      port: "any, in a storm",
      ssl: true,
      min: 97,
      max: 195,
    });

    delete process.env.API_INTEROP_PRODUCTION;
  });
});
