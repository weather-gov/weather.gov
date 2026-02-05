# Response timing Schema

```txt
https://weather.gov/interop.schema.json#/properties/@metadata/properties/timing
```

The time spent answering the request.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## timing Type

`object` ([Response timing](interop-layer-properties-response-metadata-properties-response-timing.md))

# timing Properties

| Property    | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                                                         |
| :---------- | :------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [e2e](#e2e) | `number` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-response-metadata-properties-response-timing-properties-e2e.md "https://weather.gov/interop.schema.json#/properties/@metadata/properties/timing/properties/e2e")                 |
| [api](#api) | `object` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-response-metadata-properties-response-timing-properties-response-api-timing.md "https://weather.gov/interop.schema.json#/properties/@metadata/properties/timing/properties/api") |

## e2e

Total time spent, in seconds.

`e2e`

* is optional

* Type: `number`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-response-metadata-properties-response-timing-properties-e2e.md "https://weather.gov/interop.schema.json#/properties/@metadata/properties/timing/properties/e2e")

### e2e Type

`number`

## api

Time spent making and receiving each request and response to the NWS public API. Keys are the API URLs and values are the times in seconds.

`api`

* is optional

* Type: `object` ([Response API timing](interop-layer-properties-response-metadata-properties-response-timing-properties-response-api-timing.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-response-metadata-properties-response-timing-properties-response-api-timing.md "https://weather.gov/interop.schema.json#/properties/@metadata/properties/timing/properties/api")

### api Type

`object` ([Response API timing](interop-layer-properties-response-metadata-properties-response-timing-properties-response-api-timing.md))
