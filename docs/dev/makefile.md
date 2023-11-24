# Our Makefile

We have a Makefile that scripts some of the routine development tasks we have
with Drupal or Drush. That Makefile takes care of making sure your commands are
run inside the correct container. To get the full list of self-documented Make
commands, just run

```sh
make
```

from the root of this project. This is a useful tip for quickly seeing or
recalling a specific command. The commands are also listed here:

| target                     | description                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `help`                     | Shows the list of make commands.                                                                                                                                               |
| `a11y`                     | Runs our accessibility tests using Cypress and Axe. Configured for WCAG2 AA.                                                                                                   |
| `build-css`                | Builds our CSS.                                                                                                                                                                |
| `cc` or `clear-cache`      | Runs `drush cache:rebuild` to rebuild Drupal caches.                                                                                                                           |
| `ci` or `composer-install` | Runs `composer install` in the container.                                                                                                                                      |
| `dd` or `database-dump`    | Dumps your current Drupal database to a dump.sql file.                                                                                                                         |
| `dr` or `database-restor`  | Restores from a dump.sql file into a MySQL-compatible database.                                                                                                                |
| `ee` or `end-to-end-test`  | Run our end-to-end tests with Cypress.                                                                                                                                         |
| `export-config`            | Exports the current Drupal configuration to Yaml files.                                                                                                                        |
| `export-content`           | Exports all current content using the single_content_sync module. Produces either a bunch of Yaml files or a single zip file, depending on the available content.              |
| `format`                   | Runs `phpcbf` to format all of our PHP code according to the style guide.                                                                                                      |
| `import-config`            | Imports configuration from Yaml files into Drupal.                                                                                                                             |
| `import-content`           | Imports content using the single_content_sync module, from a bunch of Yaml or zip files produced in a previous export.                                                         |
| `install-site`             | Installs a new minimal Drupal site using our previously-exported configuration and populated with previously-exported content.                                                 |
| `lint`                     | Runs `phpcs` to scan all of our PHP code for conformance to our code style guide                                                                                               |
| `log`                      | Outputs and follows the logs from the Drupal container                                                                                                                         |
| `rebuild`                  | Destroy and rebuild the Drupal container, but leaves the database intact                                                                                                       |
| `reset-site`               | Destroys and rebuilds the database but leaves Drupal intact                                                                                                                    |
| `shell`                    | Get a shell inside the Drupal container. This allows running `drush` commands.                                                                                                 |
| `u` or `unit-test`         | Run our PHP unit tests with PHPUnit. Test coverage information will be placed in the `.coverage` directory.                                                                    |
| `zap`                      | Destroys all containers and rebuilds, including re-populating the database. This can be helpful if you've made a bunch of changes and suddenly everything has stopped working. |
| `install-site-config`      | **[HIDDEN]** Installs a new minimal site using our previously-exported configuration, but does not import content                                                              |
| `pause`                    | **[HIDDEN]** Does nothing for five seconds, then exits.                                                                                                                        |
| `reset-site-database`      | **[HIDDEN]** Destroys and recreates the database, but does not repopulate it with anything                                                                                     |
| `zap-containers`           | **[HIDDEN]** Destroys and recreates all containers, but does not repopulate anything.                                                                                          |

> [!NOTE]  
> The hidden targets are valid and can be used, but they mostly just exist as
> reusable components for other targets. For example, the `zap` target is just
> alias to call:
>
> - `zap-containers`
> - `rebuild`
> - `pause`
> - `install-site`
