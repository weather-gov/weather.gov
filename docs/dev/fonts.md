# Fonts

We retrieve fonts from https://fontsource.org/, which is a monorepo of Open Source fonts. Specifically we depend on:

- https://fontsource.org/fonts/dm-mono
- https://fontsource.org/fonts/nunito-sans

We need the `svg`, `woff`, _and_ `woff2` variants since USWDS will parameterize the fonts for widespread support (see `$theme-font-sans-custom-src` and `$theme-font-mono-custom-src` in [`_uswds-theme.scss_`](../../forecast/frontend/assets/sass/_uswds-theme.scss)).

Currently we are at version 5.2.7 for both fonts.

## Upgrading local fonts

- retrieve the fonts as zip files
- in `frontend/assets/fonts`:
  - unzip `dm-mono_$version.zip` in `dm-mono`
  - unzip `nunito-sans_$version.zip` in `nunito-sans`
  - this will generate both `ttf/` and `webfonts/` directories.
  - move the ttf and webfile files in one directory: `mv ttf/* webfonts/* .`
  - for DM Mono: remove `dm-mono-latin-ext-*`
  - for Nunito Sans: remove `nunito-sans-cyrillic-*`, `nunito-sans-vietnamese-*`, and `nunito-sans-latin-ext-*`

## cmi-radar

When we update CMI Radar, it also comes with its own fonts that need to be updated separately.

We have two cases here:

- Referenced radar fonts in the CSS

We have to download any referenced radar fonts separately (e.g., if the `cmi-radar` CSS contains `url(merriweather-latin-300italic.e1331f53.woff)`, we have to download and put in the appropriate place). This is a manual process.

Note that because we _also_ post-process assets, we will append a very similar hash to the resulting file: `./public/css/radar/merriweather-latin-300italic.e1331f53.e1331f5397c2.woff`. This is messy but should work.

- Merriweather fonts

We download `Merriweather` (version 5.2.11) from https://fontsource.org/fonts/merriweather

Unfortunately, we also must manually rename to fit `cmi-radar` CSS references. Currently `cmi-radar` only uses Light (300), Regular (400), and Bold (700) variants.
