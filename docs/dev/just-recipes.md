# Our Just recipes

We use [Just](https://github.com/casey/just) as a command-runner to script some
of the routine development and environment maintenance tasks we run into. Our
Just file is self-documented, so you can get a list of available "recipes" and
documentation about them by opening a terminal in the project root and running:

```sh
just
```

The recipes are also listed here:

### Building

| Recipe     | Description                                 |
| ---------- | ------------------------------------------- |
| `just css` | Builds USWDS, assets, and our custom styles |
| `just svg` | Builds the spritesheet of weather icons     |

### Dev environment management

| Recipe      | Description                                                                                                                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `just init` | This creates and starts our development containers, creates and migrates the database tables, loads initial CMS content, and loads spatial data. Once this finishes, you should have a fully-operational site at [http://localhost:8080/](http://localhost:8080/) |
| `just zap`  | Sometimes our databases or whatever get into a funky state and we need to just start over. This will destroy the project containers and Docker volumes and then re-run `init`. Passing `--build` will force a rebuild of containers. |
| `just buildzap` | Equivalent to `just zap --build`. |

> [!NOTE]
> In the `zap` recipe, the spatial data is dumped to a SQL file before destroying
> the containers. As part of the `init` recipe, if a spatial SQL dump exists,
> that will be restored rather than iterating through shapefiles to populate the
> database. Restoring from a dump is much, much faster.

### Django management

| Recipe                  | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `just create-superuser` | Creates a Wagtail superuser. Run and follow the provided instructions |
| `just django-restart`   | Restarts the Django contianer.                                        |
| `just make-migrations`  | Generates Django migrations based on model changes.                   |
| `just migrate`          | Runs Django migrations.                                               |
| `just shell`            | Opens a Python shell inside the Django container.                     |

### Cache management

| Recipe                   | Description                                                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `just clear-alert-cache` | This drops all alerts from the alert cache. This can be especially useful if you are switching between bundles or turning bundles off entirely. |

### Code quality

| Recipe                 | Description                             |
| ---------------------- | --------------------------------------- |
| `just format-js`       | Run Javascript linters.                 |
| `just format-style`    | Run our stylesheet formatter.           |
| `just format-template` | Format our Django HTML templates.       |
| `just lint`            | Run all of our linters and formatters.  |
| `just lint-js`         | Run our Javascript formatters.          |
| `just lint-python`     | Lint and format all of our Python code. |
| `just lint-style`      | Lint our stylesheets.                   |
| `just lint-template`   | Lint our Django HTML templates.         |

### Testing

| Recipe              | Description                                       |
| ------------------- | ------------------------------------------------- |
| `just test-a11y`    | Run automated accessibility testing in Playwright |
| `just test-e2e`     | Run end-to-end browser testing in Playwright      |
| `just test-interop` | Run tests on the API interop layer                |
| `just test-wc`      | Run web component unit tests                      |

### Spatial data management

| Recipe                | Description                                                      |
| --------------------- | ---------------------------------------------------------------- |
| `just dump-spatial`   | Dumps our spatial database into a JSON file.                     |
| `just load-spatial`   | Load spatial data from shapefiles _or_ dumped JSON file.         |
