# List of hourly QPFs Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf
```

Forecast quantitative precipitation for this forecast period. Note that QPF is delivered in multi-hour totals rather than individual-hour totals, so it must be treated differently than other forecast period data.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## qpf Type

`object[]` ([QPF](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-qpf.md))

all of

* [Untitled undefined type in weather.gov API interoperability layer](interop-layer-properties-forecast-properties-list-of-daily-forecasts-daily-forecast-properties-list-of-hourly-qpfs-allof-0.md "check type definition")
