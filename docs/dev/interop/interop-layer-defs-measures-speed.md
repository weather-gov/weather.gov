# Speed Schema

```txt
https://weather.gov/interop.schema.json#/$defs/measures/speed
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## speed Type

`object` ([Speed](interop-layer-defs-measures-speed.md))

# speed Properties

| Property     | Type      | Required | Nullable       | Defined by                                                                                                                                                                   |
| :----------- | :-------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [mph](#mph)  | `integer` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-measures-speed-properties-mph.md "https://weather.gov/interop.schema.json#/$defs/measures/speed/properties/mph") |
| [km/h](#kmh) | `integer` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-measures-speed-properties-h.md "https://weather.gov/interop.schema.json#/$defs/measures/speed/properties/km/h")  |

## mph

Speed, in miles per hour.

`mph`

* is required

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-measures-speed-properties-mph.md "https://weather.gov/interop.schema.json#/$defs/measures/speed/properties/mph")

### mph Type

`integer`

## km/h

Speed, in kilometers per hour.

`km/h`

* is required

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-measures-speed-properties-h.md "https://weather.gov/interop.schema.json#/$defs/measures/speed/properties/km/h")

### h Type

`integer`
