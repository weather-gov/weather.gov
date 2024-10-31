# Intercepting calls to the API

Sometimes we don't want to use the live API while we're developing. Having a
static set of well-defined data can be easier to work with in those cases. It
can also allow us to capture data that causes bugs so we can add tests for them
and fix them more easily without hoping the weather stays the same.

Our proxy server runs in dev environments at
[http://localhost:8081](http://localhost:8081).

By default, our dev and CI/CD environments use our proxy server. The proxy is a
small Node.js app using Express listening on port 8081. Both Drupal and the
interop layer support an `API_URL` environment variable to redirect their API
calls to the proxy service. (If the environment variable is missing, they both
default to `https://api.weather.gov`).

The proxy can operate in two modes: "playing" and "passthrough." In passthrough
mode, it passes API requests directly through to the public NWS weather API.
In this mode, local data is not served at all. In "playing" mode, it checks if
there is a corresponding local file for the request. If so, it returns it
immediately. Otherwise, it passes the request on to the public API.

## Proxied data

The proxy stores its data in "bundles," collections of data that can be turned
on individually to allow us to segregate data based on particular testing or
development needs. These bundles can be created from the proxy interface itself.
The bundles can also be enabled for playback or stopped from this interface.

Data captured by the bundle is modified in one crucial way. Any ISO 8601
timestamps are converted to a special token indicating the number of seconds
between that timestamp and "now." These tokens are converted back into
timestamps relative to the current time when the data is served. This way, the
times are constant relative to whatever time you're viewing it. More information
about time tokens is provided below, in case you need to manually tweak it.

To create a new bundle, scroll to the bottom of the interface to the
**Create a new bundle** heading. Enter the URL to a weather.gov 2.0 point
location page. The latitude and longitude are parsed from the URL and used to
fetch data. When you click the "create bundle" button, all of the data necessary
to render the point forecast page is fetched from the public API and written to
disk. The location is dependent on the current Javascript timestampe (Unix
epoch, in milliseconds). Creating a bundle also captures all currently active
alerts.

> Once you've created a bundle, you can rename it by changing its directory
> name. Bundle names are just directory names.

It is also possible to add additional points to a bundle from the interface.
First start playing a bundle using one of the buttons at the very top or bottom
of the page. Then, at the end of the list of points included in the current
bundle, find the heading that says **Add a point to [name] bundle**. This form
also takes a URL and follows the same logic as creating a new bundle except
instead of saving to a new location based on the current time, it saves to the
same location as the current bundle. Saving a new point also **_DOES NOT_**
save alerts. This is to prevent data corruption.

### Updating alerts in an existing bundle

Alerts can be manually updated or added to an existing bundle by editing the
bundle's `alerts__status=actual.json` file. Be aware that modifying the alerts
file manually can have consequences for auotmated tests, so be sure to run tests
before commiting those changes.

If you want to add a new point to an existing bundle **_and_** capture that
point's alerts, one possible workflow is this:

1. Add the point to your existing bundle
2. Create a new bundle with the same point
3. Copy the alerts from the new bundle into the existing bundle's alerts file

## File structure

The data used by the proxy is stored in the `tests/api/data` directory as JSON
files. The content of these files should match the results from the API as
closely as possible so we are testing our code against realistic data. The
directory structure and filenames are based on the URL being requested. For
example, this request:

```
https://api.weather.gov/gridpoints/ABC/32,58/forecast/hourly
```

would correspond to this file path:

```
tests/api/data/[bundle]gridpoints/ABC/32,58/forecast/hourly.json
```

Any query parameters in the request are appended to the filename with a leading
double underscore. For example, this URL:

```
https://api.weather.gov/alerts/active?status=actual&point=10,10
```

would correspond to this file path:

```
tests/api/data/[bundle]alerts/active__status=actual&point=10,10.json
```

## Timestamp tokens

We don't generally want to persist the timestamps provided by the API because
time marches on, and if we don't update the timestamps, eventually the data we
captured will be stale and our code will discard it. To mitigate this, the proxy
supports timestamp tokens that it converts into ISO 8601 strings when it serves
the saved data.

There are essentially two token types: offset from "now", and a specific time
relative to "today."

### Offset from now

This is the simpler version. It can add or subtract units of time from the
current time. The token looks like this:

`date:now [+|-][number] [units]`

For example, to generate a time that is two hours in the future, the token would
look like this:

`date:now +2 hours`

For 30 minutes in the past:

`date:now -30 minutes`.

The number and units are passed directly into
[Day.js's `.add` method](https://day.js.org/docs/en/manipulate/add), so use that
documentation to know what units are available. You can also leave the
number and units off entirely to just get the current time.

> [!NOTE]  
> There are some special cases to how the proxy converts these tokens into
> timestamps. If it is handling "hourly" data, such as from the public API's
> `/gridpoints/{WFO}/{x},{y}` or `/gridpoints/{WFO}/{x},{y}/forecast/hourly`
> endpoints, it will round the timestamp down to the nearest hour for the
> `startTime`, `endTime`, and `validTime` properties. This is to ensure we
> properly emulate the API's behavior where those values are always aligned
> perfectly to the start of an hour.

### Specific time relative to today

Sometimes you need things to be at specific times of day, not just relative to
now. For example, some data that should always be interpretted as "this
afternoon." For those, the token looks like this:

`date:today [HH]:[mm]:[+|-][UTC offset] [+|-]number [units]`

> [!CAUTION]
>
> - Note the colon between the minute and the UTC offset. This is required.
> - The UTC offset is expressed in whole hours. Six hours behind UTC is
>   expressed as `-6`, not the more common `-600` or `-0600`.

With this format, the hour, minute, and UTC offset are **_required_**. The
number and units are adjustments handled the same as the `date:now` token above.
For example, if you wanted to represent 6am in Central Daylight Time for today,
you could do:

`date:today 06:00:-5`

For 3pm Pacific Standard Time tomorrow, you could do this:

`date:today 15:00:-8 +1 day`
