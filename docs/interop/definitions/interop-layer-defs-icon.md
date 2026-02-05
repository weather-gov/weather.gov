# Icon Schema

```txt
https://weather.gov/interop.schema.json#/$defs/icon
```

Information about the icon that represents this forecast period's conditions.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## icon Type

`object` ([Icon](interop-layer-defs-icon.md))

# icon Properties

| Property      | Type     | Required | Nullable       | Defined by                                                                                                                                                 |
| :------------ | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [icon](#icon) | `string` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-icon-properties-icon.md "https://weather.gov/interop.schema.json#/$defs/icon/properties/icon") |
| [base](#base) | `string` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-defs-icon-properties-base.md "https://weather.gov/interop.schema.json#/$defs/icon/properties/base") |

## icon

The icon filename, as used by weather.gov.

`icon`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-icon-properties-icon.md "https://weather.gov/interop.schema.json#/$defs/icon/properties/icon")

### icon Type

`string`

## base

The basename of the icon (without file extension).

`base`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-defs-icon-properties-base.md "https://weather.gov/interop.schema.json#/$defs/icon/properties/base")

### base Type

`string`
