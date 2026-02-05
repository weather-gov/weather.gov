# Dependencies

Here we try to keep track of the runtime dependencies that we rely on. We do not document testing, developer-experience, or build-time dependencies here.

## Criteria & checklist

Our checklist is inspired from the [Concise Guide for Evaluating Open Source Software](https://best.openssf.org/Concise-Guide-for-Evaluating-Open-Source-Software).

- Can we avoid using this contributed module? Why not? Make a "decision record" in our [contributed module decision records](#decision-records) section below describing the reasoning.
- Take a look at the documentation. Is it easy to use and correctly configure? Is there an effort made to make it easy to secure? If we need a module for a specific purpose, does the installed code beyond that purpose? If so, is there a smaller package we could use instead?
- Take a look at the code. Are there any red flags? See item 10 in the [Concise Guide for Evaluating Open Source Software](https://best.openssf.org/Concise-Guide-for-Evaluating-Open-Source-Software) on how to conduct a code evaluation of third-party software.
- Do not use a beta or dev release of a module, even if it provides functionality we are seeking.
- Choose modules with more than one maintainer.
- Look at number of commits by maintainers and historical activity. There is no specific limit, but if there is a low number of commits it might be something to flag.
- Look at download numbers and number of sites using the module for an indication of usage.
- Look at the time since the last commit. We are looking for commits made in the last month. If there have been no new commits in the last three months, consider not using the module unless functionality is very simple and the module is considered "feature complete".
- Look at open issues, closed issues, and open bugs to ensure functionality we are seeking from the module is not impacted by any of these issues. Frequency of opened and closed issues is also an indicator of how well maintained the module is.

## Management

To the extent practical, we lock dependencies to specific versions.

For Python dependencies, we use [`uv`](https://docs.astral.sh/uv/) to install and
manage dependencies. We use its `export` command to generate requirements files that
are understood by pip, since pip is required by cloud.gov. The commands are:

```
uv export --no-dev --format requirements.txt>requirements.txt
uv export --group dev --format requirements.txt>requirements.dev.txt
```

These commands create `requirements.txt` files in pip-standard format that include
specific versions as well as hashes to be checked. This way, we only need to run
`pip install -r requirements.txt` to ensure our production environment
dependencies precisely match our dev and test environments.

> [!NOTE]
> uv places dependencies in pyproject.toml according to the PEP 508 standard, so
> using other tools for dependency management should not be a significant burden.

For NPM dependencies, this is handled automatically by the `npm` command-line tool.
It creates and maintains a `package-lock.json` file. At install time, we use `npm ci`
to ensure that the versions installed exactly match those we have built and tested against.

## Decision records

### Backend

#### [`Wagtail`]()

_Added in September, 2025_

#### Django GIS database extensions

_Added in September, 2025_

These extensions provide field definitions for spatial datatypes in Django. They
require [gdal](https://gdal.org/) to be installed locally.

#### Django-Storages (S3)

_Added in October, 2025_

This backend relies on the `boto3` library and is used to store media uploads
(such as weather stories and situation report PDFs) on a public S3 bucket.

#### PostGIS

_Added in September, 2025_

PostGIS is a set of extensions applied to PostgreSQL that enable high-performance
geospatial capabilities. This lets us handle more geospatial work in an optimized
environment rather than doing it in memory in code.

#### Deepmerge

_Added in December, 2025_

This is a utility for deeply merging lists and dictionaries. Initially introduced
to support a default set of hazardous weather metadata while allowing WFOs to
override specific pieces of it.

#### Shapely

_Added in December 2025_

[Shapely](https://shapely.readthedocs.io/en/stable/) is a Python package for manipulation
and analysis of planar geometric objects. This is a package used for sorting polygons by size. 
We can extend functionality of this package if we need to do more geospatial calcuations.

### Frontend

#### [Chart.js](https://www.chartjs.org/)

_Added September, 2024_

This provides the ability to create charts in the web browser. We chose Chart.js
because it is widely-used and well-supported.

Our initial evaluation concluded that we needed to use a charting library that
used the web canvas. The primary alternatives are libraries that create SVG
graphics in-place on the browser. However, even a modestly complex chart may
create hundreds of DOM nodes, and we anticipate having several charts on the
page.

This is a problem because it impacts browser performance characteristics. Having
a large number of DOM nodes increases the time for the page to first render,
the amount of memory required to display the page, and the time required to make
dynamic visual changes, such as expanding the hourly forecast. Adding thousands
of additional nodes for charting would push us far beyond the boundaries of what
Google Lighthouse recommends – about 1,400 is the upper bound of "good," and
even without charts, our page was already over 6,600 nodes.

Having chosen to go the canvas-based route, we then picked Chart.js because it
is well-supported, widely-used, and swapping between libraries is relatively
lightweight. Bluntly, we picked it because we were familiar with it and didn't
see much risk in needing to change libraries later.

### Interop layer

#### PostGIS

_Added in September, 2025_

PostGIS is a set of extensions applied to PostgreSQL that enable high-performance
geospatial capabilities. This lets us handle more geospatial work in an optimized
environment rather than doing it in memory in code.
