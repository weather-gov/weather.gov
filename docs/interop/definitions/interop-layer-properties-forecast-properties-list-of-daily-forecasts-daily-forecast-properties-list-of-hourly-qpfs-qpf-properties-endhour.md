# Untitled string in weather.gov API interoperability layer Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/qpf/items/properties/endHour
```

The ending hour in the timezone of the forecast, in AM/PM.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## endHour Type

`string`

## endHour Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^1?\d (A|P)M$
```

[try pattern](https://regexr.com/?expression=%5E1%3F%5Cd%20\(A%7CP\)M%24 "try regular expression with regexr.com")
