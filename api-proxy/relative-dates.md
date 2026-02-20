# Relative dates in the API proxy

The API proxy understands "relative times" in order to support the need to
represent different times of day in weather data. This doc describes what
is supported and how to use it.

## Time strings

Any object key or property in any JSON file can be a relative time string.
These strings are replaced with an ISO8601 timestamp, based on the current
time, whenever the proxy serves the data. Time strings must follow a particular
format, and must always start with either:

1. `date:now`
2. `date:today`

These represent the two broad types of relative times that the proxy can
handle.

## Now-based strings

By default, a "now" string is relative to this precise moment, down to the
second. However, sometimes we need times that align with the start of the
hour – for example, forecast days, hourly forecasts, GHWO, etc. To create a
time string that's based on precisely now, you would start with:

```
date:now
```

However, if the time needs to start at the beginning of the current hour,
you would use this:

```
date:now:hour
```

## Today-based strings

Sometimes we need times that are at specific times of day. Day periods in the
daily forecast are an example of this: while the first period begins at the
start of the current hour, subsequent day periods start at 6am or 6pm. To
accomplish this, use this format:

```
date:today HH:mm:+h
```

Today-based strings **_MUST_** include a time of day in 24-hour format, where
the hour and minute are two-digits with leading zeros if necessary. Furthermore,
the time must include a UTC offset in the form of `+h` or `-h`. This describes
the number of hours from UTC.

> [!NOTE]  
> UTC offset is **_required_**. Use +0 or -0 for UTC.

> [!NOTE]  
> In case you're used to working with ISO8601 date strings, be mindful that
> in proxy relative date strings, the UTC offset is separated from the time
> with a colon.

So for a day period starting at 6am today, you can represent that this way:

```
date:today 06:00:-0
```

## Time adjustments

Here's the relative part! All relative date strings can include adjustments.
These are positive or negative integer amounts of time to adjust by. For
example:

```
date:now +3 hours
date:now -4 minutes
date:today 06:00:-6 +3 days
```

The adjustments are a single value. If you need to adjust by multiple units,
you'll need to convert to the smallest unit. For example, 1.5 hours becomes 90
minutes instead. Supported units are:

- `d`/`day`/`days`
- `h`/`hour`/`hours`
- `m`/`minute`/`minutes`
- `s`/`second`/`seconds`
