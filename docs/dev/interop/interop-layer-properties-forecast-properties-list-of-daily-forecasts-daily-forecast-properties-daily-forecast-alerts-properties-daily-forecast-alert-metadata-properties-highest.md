# Untitled string in weather.gov API interoperability layer Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/metadata/properties/highest
```

The alert level, as defined by weather.gov.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## highest Type

`string`

## highest Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value       | Explanation |
| :---------- | :---------- |
| `"warning"` |             |
| `"watch"`   |             |
| `"other"`   |             |