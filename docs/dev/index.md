# Development

## Getting started

We use Docker to take care of all the heavy lifting for setup and configuration.
To get up and running quickly with Docker, ensure you have Docker installed and
then:

1. Clone this repository into a new directory and `cd` into it.
2. Run `docker compose up` from the command line.
3. Install our site configuration by running `make install-site`.
4. Browse to [http://localhost:8080](http://localhost:8080) in your broswer. You
   should see our front page! Congrats!
5. Browse to [http://localhost:8080/user/login](http://localhost:8080/user/login)
   to log in. Your username is `admin` and your password is `root`. Then you can
   do stuff!

## Managing Drupal in the container

We have a Makefile that scripts some of the routine development tasks we have
with Drupal or Drush. That Makefile takes care of making sure your commands are
run inside the correct container. To get the full list of self-documented Make
targets, just run

```sh
make
```

from the root of this project. (A target is essentially what Make calls its
scripts. You run a target by running `make [target name]`.) The self-documented
target list should always be the most up-to-date, but the list of targets here
should also be maintained:

| target                | description                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `help`                | Shows the list of make targets                                                                                                                                                 |
| `clear-cache or `cc`  | Runs `drush cache:rebuild`                                                                                                                                                     |
| `export-config`       | Exports the current Drupal configuration to Yaml files                                                                                                                         |
| `export-content`      | Exports all current content using the single_content_sync module. Produces either a bunch of Yaml files or a single zip file, depending on the available content.              |
| `format`              | Runs `phpcbf` to format all of our PHP code according to the style guide                                                                                                       |
| `import-config`       | Imports configuration from Yaml files into Drupal                                                                                                                              |
| `import-content`      | Imports content using the single_content_sync module, from a bunch of Yaml or zip files produced in a previous export                                                          |
| `install-site`        | Installs a new minimal Drupal site using our previously-exported configuration and populated with previously-exported content                                                  |
| `lint`                | Runs `phpcs` to scan all of our PHP code for conformance to our code style guide                                                                                               |
| `rebuild`             | Destroy and rebuild the Drupal container, but leaves the database intact                                                                                                       |
| `reset-site`          | Destroys and rebuilds the database but leaves Drupal intact                                                                                                                    |
| `shell`               | Get a shell inside the Drupal container. This allows running `drush` commands.                                                                                                 |
| `zap`                 | Destroys all containers and rebuilds, including re-populating the database. This can be helpful if you've made a bunch of changes and suddenly everything has stopped working. |
| `install-site-config` | **[HIDDEN]** Installs a new minimal site using our previously-exported configuration, but does not import content                                                              |
| `reset-site-database` | **[HIDDEN]** Destroys and recreates the database, but does not repopulate it with anything                                                                                     |
| `zap-containers`      | **[HIDDEN]** Destroys and recreates all containers, but does not repopulate anything.                                                                                          |

> [!NOTE]  
> The hidden targets are valid and can be used, but they mostly just exist as
> reusable components for other targets. For example, the `zap` target is just
> alias to call:
>
> - `zap-containers`
> - `rebuild`
> - `install-site`
