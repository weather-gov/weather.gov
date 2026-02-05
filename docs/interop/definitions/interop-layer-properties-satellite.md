# Satellite Schema

```txt
https://weather.gov/interop.schema.json#/properties/satellite
```

Information about satellite imagery for this point.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## satellite Type

`object` ([Satellite](interop-layer-properties-satellite.md))

# satellite Properties

| Property    | Type     | Required | Nullable       | Defined by                                                                                                                                                                    |
| :---------- | :------- | :------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [gif](#gif) | `string` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-satellite-properties-gif.md "https://weather.gov/interop.schema.json#/properties/satellite/properties/gif") |

## gif

URL to the 600x600 geocolor GIF of the most recent satellite for this point.

`gif`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-satellite-properties-gif.md "https://weather.gov/interop.schema.json#/properties/satellite/properties/gif")

### gif Type

`string`

### gif Constraints

**URI**: the string must be a URI, according to [RFC 3986](https://tools.ietf.org/html/rfc3986 "check the specification")
