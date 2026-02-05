# Untitled string in weather.gov API interoperability layer Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/timeLabel
```

Textual representation of the hour range covered by this period, in the timezone of the location.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## timeLabel Type

`string`

## timeLabel Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^1?[0-9]-1?[0-9]$
```

[try pattern](https://regexr.com/?expression=%5E1%3F%5B0-9%5D-1%3F%5B0-9%5D%24 "try regular expression with regexr.com")
