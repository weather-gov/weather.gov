# Point alerts Schema

```txt
https://weather.gov/interop.schema.json#/properties/alerts
```

Alerts that are applicable to the given lat/lon.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## alerts Type

`object` ([Point alerts](interop-layer-properties-point-alerts.md))

# alerts Properties

| Property                      | Type     | Required | Nullable       | Defined by                                                                                                                                                                                      |
| :---------------------------- | :------- | :------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [items](#items)               | `array`  | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items")      |
| [highestLevel](#highestlevel) | `string` | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-highestlevel.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/highestLevel") |

## items

The alerts themselves

`items`

* is required

* Type: `object[]` ([Alert](interop-layer-properties-point-alerts-properties-list-of-alerts-alert.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items")

### items Type

`object[]` ([Alert](interop-layer-properties-point-alerts-properties-list-of-alerts-alert.md))

## highestLevel

The alert level, as defined by weather.gov.

`highestLevel`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-highestlevel.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/highestLevel")

### highestLevel Type

`string`

### highestLevel Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value       | Explanation |
| :---------- | :---------- |
| `"warning"` |             |
| `"watch"`   |             |
| `"other"`   |             |
