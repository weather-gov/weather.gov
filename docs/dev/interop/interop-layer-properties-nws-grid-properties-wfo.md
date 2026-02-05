# Untitled string in weather.gov API interoperability layer Schema

```txt
https://weather.gov/interop.schema.json#/properties/grid/properties/wfo
```

The NWS weather forecasting office (WFO) that serves this point.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## wfo Type

`string`

## wfo Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^[A-Z]{3}$
```

[try pattern](https://regexr.com/?expression=%5E%5BA-Z%5D%7B3%7D%24 "try regular expression with regexr.com")
