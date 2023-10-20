# Our Drupal setup

We are taking a fairly conventional approach to Drupal development: we have
modules to handle fetching weather data from external sources, managing routing,
and create and populate blocks; and we have a theme that takes care of rendering
our pages with the correct markup and styles.

> [!NOTE]  
> Our decision to use a content management system is documented in
> [architectural decision record #3](../architecture/decisions/0003-we-will-use-a-content-management-system.md).
>
> Our decision to use Drupal is documented in
> [architectural decision record #4](../architecture/decisions/0004-we-will-use-drupal-10-as-our-content-management-system.md).

## Theme

Ultimately, our theme is the heart and soul of our custom development. Our theme
adds the [US Web Design System](https://designsystem.digital.gov) as the
foundation that we then build upon. This theme takes care of adding the correct
stylesheets and Javascript to pages.

> [!NOTE]  
> Our decision to use USWDS is documented in
> [architectural decision record #2](../architecture/decisions/0002-use-uswds.md).

Pages, views, blocks, and more are represented as Twig templates. Which ones to
render is determined by the route and the Drupal Block layout configuration.

We use USWDS utility classes where we can, rather than creating custom styles.
Any customization to the USWDS default styling is handled with our local Sass
files. We use USWDS overrides and utility mixins as much as possible to minimize
truly custom styles.

> [!NOTE]  
> Our decision to use USWDS utilities is documented in
> [architectural decision record #7](../architecture/decisions/0007-we-will-use-utility-first-approach-to-css.md).

## Modules

#### Routes

The routes module (`weather_routes`) defines some routes that we want to handle
dynaimcally. For example, the route `/point/{latitude}/{longitude}` will attempt
to find the correct WFO grid cell for the specified point and redirect the user
to a route for that grid.

This route also defines route parameters so the parameters can be queried
elsewhere. For exaple, defining the `/local/{wfo}/{gridX}/{gridY}/{location}`
route makes it possible for other modules and blocks to query the route for
parameters, something like:

```php
$route->getParameter('wfo');
```

This module should do very little business logic and instead should focus on
directing users to their desired location and making sure route-appropriate data
is available to the more logic-focused modules.

#### Weather data

The data module (`weather_data`) acts as a wrapper around the api.weather.gov
REST API. It also handles data normalization (e.g., ensuring that everything is
in Fahrenheit, converting wind angles into ordinal/cardinal names, etc.).

#### Weather blocks

The blocks module (`weather_blocks`) provides the code-defined blocks that we
use. This module is essentially responsible for mapping weather data into
content types on the page.

## Diagram

![weather.gov software stack diagram](../architecture/diagrams/weather.gov%20software%20stack.png)
