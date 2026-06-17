US WEB DESIGN SYSTEM
-----------------
This theme uses the US Web Design System. For installation and configuration,
please refer to the [documentation](https://designsystem.digital.gov/documentation/getting-started/developers/phase-two-compile/)

NOTE:
-----------------
A recent USWDS update (3.13.0) is interacting with our custom styles, sometimes causing styling to get wonky. When you run `just css` to compile new css files when changing style, confirm that the output in the terminal shows `Compiling with USWDS 3.8.1`. If not, follow these steps to remove the existing USWDS image and rebuild the app using the locked 3.8.1 version.

1. `docker compose run --rm uswds`
2. `just rebuild web`
3. `just css`

You should now see the terminal showing the correct version in the compile command output.

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
