# Untitled string in weather.gov API interoperability layer Schema

```txt
https://weather.gov/interop.schema.json#/properties/forecast/properties/days/items/properties/periods/items/properties/monthAndDay
```

The short month name (eg, Jan, Feb, etc.) and day number that this forecast period applies to. Formatted in en-US locale.

| Abstract            | Extensible | Status         | Identifiable            | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :---------------------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | Unknown identifiability | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## monthAndDay Type

`string`

## monthAndDay Constraints

**pattern**: the string must match the following regular expression:&#x20;

```regexp
^[A-Z][a-z]{2} d{1,2}$
```

[try pattern](https://regexr.com/?expression=%5E%5BA-Z%5D%5Ba-z%5D%7B2%7D%20d%7B1%2C2%7D%24 "try regular expression with regexr.com")
