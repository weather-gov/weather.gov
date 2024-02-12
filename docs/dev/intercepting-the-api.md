# Intercepting calls to the API

Sometimes we don't want to use the live API while we're developing. Having a
static set of well-defined data can be easier to work with in those cases. It
can also allow us to capture data that causes bugs so we can add tests for them
and fix them more easily without hoping the weather stays the same.

By default, our dev and CI/CD environments use our proxy server. The proxy is a
small Node.js app using Express listening on port 8081. Our dev Drupal instance
is configured to use this endpoint instead of `api.weather.gov`. When the proxy
receives a request, it will first see if there is an existing JSON file that
corresponds with the request. If there is, it will simply respond with that file
and be done. Otherwise, it will forward the request on to the API and return
whatever it gets back.

To disable the proxy, visit (localhost:8081/no-local)[http://localhost:8081/no-local].
To turn it back on, visit [localhost:8081/local](http://localhost:8081/local).
It is on by default.

## Adding data

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
tests/api/data/gridpoints/ABC/32,58/forecast/hourly.json
```

Any query parameters in the request are appended to the filename with a leading
double underscore. For example, this URL:

```
https://api.weather.gov/alerts/active?status=actual&point=10,10
```

would correspond to this file path:

```
tests/api/data/alerts/active__status=actual&point=10,10.json
```

You can create these files however you want, and the proxy has a utility
function to help. It can be configured to record responses from the API and
write them to disk for you. This is off by default. To toggle it on and off,
visit [localhost:8081/record](http://localhost:8081/record).

For example, if you are looking at a location page
with some funky formatting, you can enable proxy recording, reload the page,
and then the data that led to the bug is stored on disk. The next time you
reload that page, you'll receive the same data, so no matter what happens with
the "real" data, your buggy data will remain.

You may need to manually update some parts of the captured data, however. For
example, time-sensitive data may stop being rendered once it expires. To keep
that from happening, you can replace the timestamp in the data with a token
that will be converted into a timestamp by the proxy at runtime.

For example, if you want a timestamp that is the current time, you would use
the token `date:now` instead of a timestamp. These can also be set to offset
from the current time by adding a value and unit: `date:now +1 hour`. The value
and unit are passed directly into
[Day.js's `.add` method](https://day.js.org/docs/en/manipulate/add), so use that
documentation to know what units are available.

## Recording a whole transaction

Sometimes it's easier to capture a whole series of API calls related to a single
page load so we can attach it to a bug report or issue for future investigation.
To help with this, the proxy server has another utility that will capture all
of those calls and produce a zip file with the results.

To enable this, visit [localhost:8081/bundle](http://localhost:8081/bundle). The
proxy will capture all API calls associated with the next location page load.
Once that location response is finished, the proxy will revert back to its
previous behavior (recording, passing through, etc.). The produced zip file will
be located in the `tests/api/data` directory.
