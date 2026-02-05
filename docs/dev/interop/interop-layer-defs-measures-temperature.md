# Temperature Schema

```txt
https://weather.gov/interop.schema.json#/$defs/measures/temperature
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## temperature Type

`object` ([Temperature](interop-layer-defs-measures-temperature.md))

# temperature Properties

| Property      | Type      | Required | Nullable       | Defined by                                                                                                                                                                                 |
| :------------ | :-------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [degF](#degf) | `integer` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-measures-temperature-properties-degf.md "https://weather.gov/interop.schema.json#/$defs/measures/temperature/properties/degF") |
| [degC](#degc) | `integer` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-measures-temperature-properties-degc.md "https://weather.gov/interop.schema.json#/$defs/measures/temperature/properties/degC") |

## degF

Temperature, in degrees Fahrenheit.

`degF`

* is required

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-measures-temperature-properties-degf.md "https://weather.gov/interop.schema.json#/$defs/measures/temperature/properties/degF")

### degF Type

`integer`

## degC

Temperature, in degrees Celsius.

`degC`

* is required

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-measures-temperature-properties-degc.md "https://weather.gov/interop.schema.json#/$defs/measures/temperature/properties/degC")

### degC Type

`integer`
