# Point Schema

```txt
https://weather.gov/interop.schema.json#/properties/point
```

Information about the point

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## point Type

`object` ([Point](interop-layer-properties-point.md))

# point Properties

| Property                | Type     | Required | Nullable       | Defined by                                                                                                                                                                        |
| :---------------------- | :------- | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [latitude](#latitude)   | `number` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-properties-latitude.md "https://weather.gov/interop.schema.json#/properties/point/properties/latitude")   |
| [longitude](#longitude) | `number` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-properties-longitude.md "https://weather.gov/interop.schema.json#/properties/point/properties/longitude") |

## latitude



`latitude`

* is required

* Type: `number`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-properties-latitude.md "https://weather.gov/interop.schema.json#/properties/point/properties/latitude")

### latitude Type

`number`

### latitude Constraints

**maximum**: the value of this number must smaller than or equal to: `90`

**minimum**: the value of this number must greater than or equal to: `-90`

## longitude



`longitude`

* is required

* Type: `number`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-properties-longitude.md "https://weather.gov/interop.schema.json#/properties/point/properties/longitude")

### longitude Type

`number`

### longitude Constraints

**maximum**: the value of this number must smaller than or equal to: `360`

**minimum**: the value of this number must greater than or equal to: `-360`
