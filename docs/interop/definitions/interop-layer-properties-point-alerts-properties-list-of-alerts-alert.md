# Alert Schema

```txt
https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items
```



| Abstract            | Extensible | Status         | Identifiable | Custom Properties | Additional Properties | Access Restrictions | Defined In                                                                                                 |
| :------------------ | :--------- | :------------- | :----------- | :---------------- | :-------------------- | :------------------ | :--------------------------------------------------------------------------------------------------------- |
| Can be instantiated | No         | Unknown status | No           | Forbidden         | Allowed               | none                | [interop-layer.schema.json\*](../../../api-interop-layer/interop-layer.schema.json "open original schema") |

## items Type

`object` ([Alert](interop-layer-properties-point-alerts-properties-list-of-alerts-alert.md))

# items Properties

| Property                    | Type          | Required | Nullable       | Defined by                                                                                                                                                                                                                                                            |
| :-------------------------- | :------------ | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [metadata](#metadata)       | `object`      | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata")                  |
| [id](#id)                   | `string`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-id.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/id")                                    |
| [event](#event)             | `string`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-event.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/event")                              |
| [sender](#sender)           | `string`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-sender.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/sender")                            |
| [locations](#locations)     | `object`      | Optional | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations")                |
| [description](#description) | `array`       | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description") |
| [instruction](#instruction) | `string`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-instruction.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/instruction")                  |
| [area](#area)               | `array`       | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-areas.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/area")                       |
| [sent](#sent)               | `string`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-sent.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/sent")                                |
| [effective](#effective)     | `string`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-effective.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/effective")                      |
| [onset](#onset)             | `string`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-onset.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/onset")                              |
| [expires](#expires)         | `string`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-expires.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/expires")                          |
| [ends](#ends)               | `string`      | Required | can be null    | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-ends.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/ends")                                |
| [finish](#finish)           | `string`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-finish.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/finish")                            |
| [geometry](#geometry)       | Not specified | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-geometry.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/geometry")                        |
| [duration](#duration)       | `string`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-duration.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/duration")                        |
| [timing](#timing)           | `object`      | Required | cannot be null | [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-timing.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/timing")                      |

## metadata

Prioritization and categorization metadata

`metadata`

* is optional

* Type: `object` ([Alert metadata](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/metadata")

### metadata Type

`object` ([Alert metadata](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-metadata.md))

## id

ID of this alert. NOTE: may not be globally unique

`id`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-id.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/id")

### id Type

`string`

## event

The alert event, such as 'Severe Thunderstorm Warning.'

`event`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-event.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/event")

### event Type

`string`

## sender

The government office responsible for issuing this alert. Usually a NWS office, but sometimes state or local civil authorities.

`sender`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-sender.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/sender")

### sender Type

`string`

## locations

A list of counties by state region and cities, if an alert description includes embedded location information.

`locations`

* is optional

* Type: `object` ([Alert locations](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/locations")

### locations Type

`object` ([Alert locations](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-locations.md))

## description

The alert description, parsed into content nodes.

`description`

* is required

* Type: `object[]` ([Parsed content node](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/description")

### description Type

`object[]` ([Parsed content node](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-parsed-content-nodes-parsed-content-node.md))

## instruction

Safety instructions associated with the alert

`instruction`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-instruction.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/instruction")

### instruction Type

`string`

## area

A list of areas affected by this alert, as provided by the origin.

`area`

* is required

* Type: `string[]`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-list-of-areas.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/area")

### area Type

`string[]`

## sent

When the alert was initially sent.

`sent`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-sent.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/sent")

### sent Type

`string`

### sent Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## effective

When the alert becomes effective.

`effective`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-effective.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/effective")

### effective Type

`string`

### effective Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## onset

When the conditions described in the alert are forecast to begin.

`onset`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-onset.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/onset")

### onset Type

`string`

### onset Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## expires

When the alert will expire. NOTE: this is NOT when the hazardous conditions are forecast to end.

`expires`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-expires.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/expires")

### expires Type

`string`

### expires Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## ends

When the conditions described in the alert are forecast to end.

`ends`

* is required

* Type: `string`

* can be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-ends.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/ends")

### ends Type

`string`

### ends Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## finish

When the alert will no longer displayed on weather.gov, as derived from the expires and ends properties.

`finish`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-finish.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/finish")

### finish Type

`string`

### finish Constraints

**date time**: the string must be a date time string, according to [RFC 3339, section 5.6](https://tools.ietf.org/html/rfc3339 "check the specification")

## geometry

GeoJSON GeometryCollection representing the area covered by this alert.

`geometry`

* is required

* Type: unknown

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-geometry.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/geometry")

### geometry Type

unknown

## duration

When the alert will no longer be displayed on weather.gov, in human-friendly text based on the timezone of the alert area.

`duration`

* is required

* Type: `string`

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-duration.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/duration")

### duration Type

`string`

## timing

Human-friendly text describing the beginning and completion of the alert, based on the timezone of the alert area.

`timing`

* is required

* Type: `object` ([Alert timing](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-timing.md))

* cannot be null

* defined in: [weather.gov API interoperability layer](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-timing.md "https://weather.gov/interop.schema.json#/properties/alerts/properties/items/items/properties/timing")

### timing Type

`object` ([Alert timing](interop-layer-properties-point-alerts-properties-list-of-alerts-alert-properties-alert-timing.md))
