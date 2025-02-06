**new_weather_theme** is generated from starterkit_theme. Additional information
on generating themes can be found in the
[Starterkit documentation](https://www.drupal.org/docs/core-modules-and-themes/core-themes/starterkit-theme).

US WEB DESIGN SYSTEM
-----------------
This theme uses the US Web Design System. For installation and configuration,
please refer to the [documentation](https://designsystem.digital.gov/documentation/getting-started/developers/phase-two-compile/)

USING GULP AND `uswds-compile`
-----------------
We use the NPM project `uswds-compile` to compile the Design System source code
is into browser-readable files. The entry point is **gulpfile.js** in the theme
root.

CUSTOMIZE PATH SETTINGS
-----------------
We use the default source path settings for USWDS, and use `paths.dist` settings
tell Gulp where to distribute files in our **assets** folder. One helpful way to
look at these path settings is that the `paths.src` settings are specific to the
Design System; the `paths.dist` settings are specific to your project.
[USWDS Customize path settings](https://designsystem.digital.gov/documentation/getting-started/developers/phase-two-compile/#step-5-customize-path-settings).

ADD COMPILE FUNCTIONS
-----------------
We use the `compile`, `init`, and `watch` functions, defined as exports in
**gulpfile.js**. Run `npx gulp [function]` from the theme root to use any of
these functions. For other available functions, visit
[USWDS compile functions](https://designsystem.digital.gov/documentation/getting-started/developers/phase-two-compile/#step-6-export-compile-functions).
