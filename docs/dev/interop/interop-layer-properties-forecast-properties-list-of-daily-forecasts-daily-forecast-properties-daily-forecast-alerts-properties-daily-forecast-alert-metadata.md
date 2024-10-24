# Daily forecast alert metadata Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/metadata
```

Top-level metadata about the alerts for this forecast day.

| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## metadata Type

`object` ([Daily forecast alert metadata](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-daily-forecast-alert-metadata.md))

# metadata Properties

| Property            | Type      | Required | Nullable       | Defined by                                                                                                                                                                                                                                                                                                                                                                  |
| :------------------ | :-------- | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [count](#count)     | `integer` | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-daily-forecast-alert-metadata-properties-count.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/metadata/properties/count")     |
| [highest](#highest) | `string`  | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-daily-forecast-alert-metadata-properties-highest.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/metadata/properties/highest") |

## count

The number of alerts that are applicable to this forecast day.

`count`

* is optional

* Type: `integer`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-daily-forecast-alert-metadata-properties-count.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/metadata/properties/count")

### count Type

`integer`

## highest

The alert level, as defined by weather.gov.

`highest`

* is optional

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-daily-forecast-alerts-properties-daily-forecast-alert-metadata-properties-highest.md "https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/alerts/properties/metadata/properties/highest")

### highest Type

`string`

### highest Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value       | Explanation |
| :---------- | :---------- |
| `"warning"` |             |
| `"watch"`   |             |
| `"other"`   |             |
