# We will use our CMS in traditional mode, not headless.

Date: 2023-10-03

### Status

Accepted

### Context

A headless CMS decouples the frontend experience from the content creation and management, so you can build one without having to touch the other. This can be appealing because it can mean faster iteration, and it's similar to a common, API-first approach to web development. Completely separating the data that drives an application from the presentation of that data allows developers to work on different parts simultaneously and they only need to come together to agree on how their pieces communicate.

However, a CMS doesn't simply have data. It also applies structure and meaning to the data. The application has to define all the custom content types, the structure, the relationships between them, etc. And it turns out when you define all of that in a CMS using plugins, it is also fairly straightforward to simultaneously define how that data is presented to users. The final product is not permanently bound to that presentation, but it certainly speeds up the initial process of adding new content types.

We considered the possibility of using a CMS in headless mode coupled with a static site generator (SSG). Statically generating every possible page that users might visit could have significant upsides for users. Primarily, it would mean a new weather.gov would load very quickly and require very few resources on the user's device.

It is technically possible to render every possible page. However, there are millions of them. To accurately show users their desired forecasts, we would need to render a page for every [NDFD grid](https://graphical.weather.gov/docs/ndfdSRS.htm). There are nearly 3 million grid cells just in the continental United States (CONUS). And in order for the pages to accurately represent the current state of the forecast or observations, these pages would all need to be rendered on a regular basis – probably at least hourly. As a result, we would have to render over 70 million pages per day. A single page render for a location will likely require an average of 4 API network requests, or over 280 million per day.

These numbers are vastly larger than the traffic weather.gov actually experiences, where there are about 4 million page views per day. Using a traditional CMS that renders each page on demand would typically require 4 million renders, or about 16 million API network requests. That is a full order of magnitude less work. When we also consider that many of the static pages would never be visited, it becomes clearly irresponsible to render the entire site statically.

### Decision

We will use our CMS in a traditional manner, using it to render our pages on-demand.

### Consequences

Having the CMS do the rendering means we don't need to use a client-side frontend framework for building pages. Those frameworks necessarily add network traffic and rendering complexity. If not used carefully, they can seriously degrade the user experience. By eliminating frontend frameworks, we expect a more consistent user experience and a simpler developer experience.

Moving all the rendering into the CMS may also be more equitable. Since all of the network traffic to the API is between NWS systems, user devices no longer have to make all those requests. As a result, user devices of all different specifications and levels of network connectivity and bandwidth should have more similar experiences. The heavy lifting is handled by NWS.

Making the network requests to the API from the CMS for all users may increase the amount of internet traffic passing through NWS networks. That could lead to services failing under unexpectedly high loads and could require NWS to invest in beefing up parts of its network infrastructure.

There are downstream opportunities here as well. For example, NWS could investigate some kind of network peering arrangement that allows network traffic from the CMS to the API to be fast tracked. The API could also be updated to add additional endpoints that return more of the data needed by the CMS in a single call instead of requiring multiple calls. Another possibility could be colocating the API with weather.gov so the network traffic is entirely local instead of going across the internet.

Drupal caches twig templates, which could be problematic for real-time/near-time data. It is possible to disable cacheing on a per-template basis, or we might periodically instruct Drupal to rebuild its caches. We will evaluate these options in implementation.

For realtime data that may change *while* a user is viewing it, we may use client-side Javascript to poll for updates. We are thinking of this in terms of server-side rendering, client-side updating. We will define this behavior on a component-by-component basis.

Choosing server-side rendering in the CMS does ***NOT*** preclude us from doing client-side rendering now or in the future.
