# We will use an interoperability layer between the NWS public API and the website

Date: 2024-10-01

### Status

Accepted

### Context

The public NWS API is primary data source for all observation and forecast data. The way it is architected, it requires multiple roundtrip REST requests to obtain all of the information needed to display our website. The data that comes back from the API is not precisely the structure that works best for our website, so we do some amount of processing on it before using it to render the site. We currently cache API responses with Drupal caching mechanisms, but we do not cache the processed results.

### Decision

We will introduce a new API interop layer that sits between Drupal and the public NWS API. This layer will be built in Node.js to take advantage of its multithreading support and low memory footprint.

The interop layer will present a single endpoint that returns all of the data relevant to rendering the website. Behind the scenes, the interop layer will make the necessary calls to the public API and the local geospatial database tables. The interop layer will also handle most of the processing of the raw data into structures that directly serve the website.

### Consequences

#### Positive
- In the immediate term, our Drupal modules for fetching data will be dramatically simplified if not entirely replaced. Because Drupal is single-threaded, offloading this functionality should have a positive impact on page load times.
- In the longer term, the interop layer can add caching for processed data, allowing much faster responses to page requests.
- The most significant portion of backend code is moved out of PHP and into Javascript, a language that is easier to support by 18F staff. Javascript also has very broad industry support (as does PHP), so this should not have any downstream negative consequences.
- We should have more flexibility over how we handle error cases. Currently our response to errors from the API is to simply show a red banner for whichever data component failed. Because of how the site was built with intertangled blocks, an error in one data component could cascade into errors for other components (e.g., if the forecast causes an error, we also don't show alerts). With the interop layer, we have an opportunity to separate the data components more cleanly and have more fine-grained error handling.

#### Neutral
- Additional cloud resources will be required. It seems likely to be a relatively small impact since the total amount of computation work will remain roughly the same.

#### Negative
- The interop layer introduces an additional programming language and runtime environment, increasing complexity.
