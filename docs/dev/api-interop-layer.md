# weather.gov API interop layer

We built an interop layer between weather.gov and the NWS public API to simplify
the data entering the page rendering process. The interop layer handles the
multiple requests necessary to the API, retrying in the event of errors, unit
normalization and conversion, etc.

## Caching

### Alerts

The alerts module fetches all active alerts as soon as the interop layer starts
and then every 30 seconds thereafter. This background process handles fetching,
parsing, and normalizing all the alerts. It also transparently handles errors
with the goal of always presenting alerts if we're able.

Flow diagram of how alerts are updated:

![](diagrams/interop-layer-alerts.png)

## Endpoints

There is currently only one functional endpoint in the interop layer, as it was
originally conceived as a way of having a one-stop-shop for all the data we
needed in order to render a location forecast.

### `/point/{lat}/{lon}`

[Schema of returned data](interop/README.md)

Flow diagram of how it works:

![](diagrams/interop-layer-point.png)
