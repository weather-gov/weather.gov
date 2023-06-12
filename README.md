# weather.gov 2.0

It's very early days. Don't expect to see much interesting stuff in here yet!

Work in process [documentation](https://docs.google.com/document/d/1JIagnghg3xYNm4zdr_BtxWOwmifUaxjSCeybsaoqExE/edit#heading=h.z9f0u3roste8)

## Public domain

This project is in the worldwide [public domain](LICENSE.md). As stated in [CONTRIBUTING](CONTRIBUTING.md):

> This project is in the public domain within the United States, and copyright and related
> rights in the work worldwide are waived through the
> [CC0 1.0 Universal public domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
>
> All contributions to this project will be released under the CC0 dedication. By submitting a pull
> request, you are agreeing to comply with this waiver of copyright interest.

## Tech Stack

Type: Traditional CMS (aka Legacy, United, Headful :laugh:)
Stack: Docker Drupal Image (Apache, PHP, Composer, MariaDB)
Languages and frameworks: PHP, Symfony, Twig

## Getting Drupal 10 running in Docker

Docker does all the heavy lifting for set up and configurations. It's a cinch to get up and running. Make sure you have Docker installed locally.

1. Clone this repository into a new directory and `cd` into it.
2. Run the follow command `docker compose up` from the command line. Alternatively, from VSCode, right click on the docker-compose.yml and select __Compose Up__.
3. Check your localhost in your broswer. `localhost:8080` is the default URL. You should see the default Drupal 10 install page. Complete each field using the docker-compose values. Make sure to set the __database__ value to the MariaDB Docker container, which in this case is named `database`.
4. Complete installation.
5. Review your new Drupal 10 site!


## Editing and adding themes

We [bind-mount](https://docs.docker.com/storage/bind-mounts/) the __themes__ folder so we can test adding a new theme. So changes made in the themes folder are reflected in the host folder.

1. Navigate to the Drupal Appearance page `http://localhost:8080/admin/appearance`
2. Notice the Hello World theme already there.
3. To create a new theme, run the following command from the root directory:
`php core/scripts/drupal generate-theme new_weather_theme`
4. Make sure your new theme has __underscores__ (_) as a delimiter. Dashes and spaces WILL NOT WORK.
5. Refresh the Appearance page and notice new_weather_theme is now installed.
6. Change title of the theme in `new_weather_theme.info.yml` file to a reader-friendly one, such as `New Weather`.

That's it! Now when you make changes to theme files, they will sync to the Docker instance. Don't forget to commit your changes to `git`!



