# Response metadata Schema

```txt
https://weather.gov/interop.schema.json#/properties/@metadata
```

Metadata about the response itself.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## @metadata Type

`object` ([Response metadata](interop-layer-properties-response-metadata.md))

# @metadata Properties

| Property          | Type      | Required | Nullable       | Defined by                                                                                                                                                                                           |
| :---------------- | :-------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [timing](#timing) | `object`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-response-metadata-properties-response-timing.md "https://weather.gov/interop.schema.json#/properties/@metadata/properties/timing") |
| [size](#size)     | `integer` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-response-metadata-properties-size.md "https://weather.gov/interop.schema.json#/properties/@metadata/properties/size")              |

## timing

The time spent answering the request.

`timing`

* is optional

* Type: `object` ([Response timing](interop-layer-properties-response-metadata-properties-response-timing.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-response-metadata-properties-response-timing.md "https://weather.gov/interop.schema.json#/properties/@metadata/properties/timing")

### timing Type

`object` ([Response timing](interop-layer-properties-response-metadata-properties-response-timing.md))

## size

The uncompressed size of the data being returned, excluding the metadata, in bytes.

`size`

* is optional

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-response-metadata-properties-size.md "https://weather.gov/interop.schema.json#/properties/@metadata/properties/size")

### size Type

`integer`
