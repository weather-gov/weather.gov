import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  resourceFromAttributes,
  envDetector,
  processDetector,
  hostDetector,
} from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const name = process.env.OTEL_SERVICE_NAME || "weathergov-api-interop";
const endpoint =
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
  "http://openobserve:5080/api/default/v1/traces";
const username = process.env.OTEL_USERNAME;
const password = process.env.OTEL_PASSWORD;

const headers = {};
if (username && password) {
  const authString = Buffer.from(`${username}:${password}`).toString("base64");
  headers["Authorization"] = `Basic ${authString}`;
}

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: name,
  [ATTR_SERVICE_VERSION]: "1.0.0",
});
const sdk = new NodeSDK({
  resource,
  // detectors for env/process/host info
  resourceDetectors: [envDetector, processDetector, hostDetector],
  traceExporter: new OTLPTraceExporter({
    url: endpoint,
    headers,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

// note: this file needs to be executed first, before anything else runs, so we
// can accurately trace all of the node activity.
sdk.start();
