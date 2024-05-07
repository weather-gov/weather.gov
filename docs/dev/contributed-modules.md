# Contributed modules

Drupal provides a core set of functionality as part the standard release for any given version. Sometimes, this leaves gaps in functionality we have to fill in. Often, these gaps are not things crucial to delivering weather to the public specifically, but are ancillary pieces of functionality. In this event, where core functionality and business logic do not suffice, we have another option: Contributed projects. These are community-developed modules that provide for a community need. Using a contributed module is a great way to save us time and potential bugs if we were to develop these on our own. However, using contributed modules can also pose a risk because you are relying on external contributors. We use certain guiding principles for selecting new contributed projects for inclusion in our Drupal application. We also take the time to [record decisions](#contributed-module-decision-records) about their use.

## Selection criteria & checklist

Our checklist is inspired from the [Concise Guide for Evaluating Open Source Software](https://best.openssf.org/Concise-Guide-for-Evaluating-Open-Source-Software).

- Can we avoid using this contributed module? Why not? Make a "decision record" in our [contributed module decision records](#contributed-module-decision-records) section below describing the reasoning.
- Our version of Drupal (10) is fully supported.
- Take a look at the documentation. Is it easy to use and correctly configure? Is there an effort made to make it easy to secure? If we need a module for a specific purpose, does the installed code beyond that purpose? If so, is there a smaller package we could use instead?
- Take a look at the code. Are there any red flags? See item 10 in the [Concise Guide for Evaluating Open Source Software](https://best.openssf.org/Concise-Guide-for-Evaluating-Open-Source-Software) on how to conduct a code evaluation of third-party software.
- Do not use a beta or dev release of a module, even if it provides functionality we are seeking.
- Stable releases should be covered by the [security advisory policy](https://www.drupal.org/drupal-security-team/security-advisory-process-and-permissions-policy)
- Choose modules with more than one maintainer.
- Look at number of commits by maintainers and historical activity. There is no specific limit, but if there is a low number of commits it might be something to flag.
- Look at download numbers and number of sites using the module for an indication of usage.
- Look at the time since the last commit. We are looking for commits made in the last month. If there have been no new commits in the last three months, consider not using the module unless functionality is very simple and the module is considered "feature complete".
- Ensure there is a non-beta non-dev release available i.e. a stable release.
- Look at open issues, closed issues, and open bugs to ensure functionality we are seeking from the module is not impacted by any of these issues. Frequency of opened and closed issues is also an indicator of how well maintained the module is.

## Contributed module decision records

Here is where we keep documentation on modules we have added and descriptions of what we use them for. This does not include drupal core modules, composer, or drush.

### [`auto_entitylabel`](https://www.drupal.org/project/auto_entitylabel)

_Added in April 2024_

This module allows us to hide entity field labels. It was first added so that we could have an empty title field label for the WFO promo. We want to categorize WFO promo by WFO taxonomy and not necessarily have a title label. We realized this would be a helpful module for any entities that had blank, hidden, or alternate labels.

### [`autologout`](https://www.drupal.org/project/autologout)

_Added in January 2024_

This module allows us to be compliant with AC-02(5) "Inactivity Logout", which requires us to set a 90 minute timeout period on user sessions. This is the most used module providing this functionality.

### [`config_split`](https://www.drupal.org/project/config_split)

_Added in January 2024_

We were looking for a way to disable certain modules locally (namely, samlauth and autologout) which only pertain to our cloud environments. We also wanted to set different configurations for autologout timing in beta than other cloud environments, fine tuning our settings for our production environment. This also allows us to restrict certain modules to dev-use only like `devel`. We could also use the `--no-dev` flag, but since the composer install in cloud.gov is not something we directly control, this flag is not used. `config_split` is the primary module for splitting configuration across environments. It required a complete reorganization of our configuration files.

### [`key_asymmetric`](https://www.drupal.org/project/key_asymmetric)

_Added in November 2023_

We added this library for the first time we handled secret information in our application in order to handle public/private key pairs. It is the recommended module for use with the `samlauth` module and that is why we selected it.

_Note:_ This module is not covered by Drupal's security advisory policy, and only has one maintainer. However, it is part of the larger `key` ecosystem which is covered by the policy and has many maintainers.

### [`log_stdout`](https://www.drupal.org/project/log_stdout)

_Added in May 2024_

We added this module to enable us to forward Drupal Watchdog logs to `stdout` and `stderr` instead of Drupal's internal logging database. This improves the developer experience by making logs easier to access and it allows cloud.gov to capture the logs and present them in its logging interface, which is easier to get around than Drupal's.

### [`new_relic_rpm`](https://www.drupal.org/project/new_relic_rpm)

_Added in January 2024_

We added this module when we started using New Relic for application performance metrics. It is linked to in New Relic's documentation for use in PHP/Drupal applications and is the primary way to instrument Drupal applications when using NR.

### [`s3fs`](https://www.drupal.org/project/s3fs)

_Added in November 2023_

Drupal requires us to have persistent storage. In cloud.gov, the only option for storage is s3, so we need a way to connect our persistent storage to s3. `s3fs` is the module used in cloud.gov's example Drupal application. We set our site to use S3 File System as the default. There are a host of companion modules to this one that might come in handy to extend its functionality as well.

### [`samlauth`](https://www.drupal.org/project/samlauth)

_Added in November 2023_

We use SAML to communicate with the ICAM service that backs NOAA Accounts for authentication, as is recommended by that team. There are a [variety of contributed modules](https://www.drupal.org/docs/contributed-modules/saml-authentication/using-drupal-aswith-a-saml-sp) that support SAML, but `samlauth` appeared to be the most feature-complete and user friendly of the available modules. It was also the only module that can synchronize attribute values from the IdP into user account fields.

### [`scheduler`](https://www.drupal.org/project/scheduler)

_Added in April 2024_

We wanted to give content editors the ability to schedule nodes to be published and unpublished at specific future times. This functionality would've taken us a lot of time to implement, and the available module is well-supported.

### [`single_content_sync`](https://www.drupal.org/project/single_content_sync)

_Added in June 2023_

This is a library we started using at the beginning of the project as a way to help manage syncing content across environments. It allows us to export content to a YML file with the possibility to import it to another environment.

### [`token`](https://www.drupal.org/project/token)

_Added in April 2024_

Token is a very small module that is well-supported. It provides placeholder variables for entities along with an interface for viewing them easily. It allows us to easily interpolate references in configuration to these entities. The original reason for using it was to grab the entity reference for labelling WFO promos. We installed at the same time as [`auto_entitylabel`](#auto_entitylabel).

### [`twig_tweak`](https://www.drupal.org/project/twig_tweak)

_Added in January 2024_

This module adds a lot of helper functions and filters, such as the ability to pull in an arbitrary block. We added it when setting up some of our initial twig templates.

### [`workbench`](https://www.drupal.org/project/workbench) and [`workbench_access`](https://www.drupal.org/project/workbench_access)

_Added in January 2024_

The original impetus for adding Workbench, was actually Workbench Access, the comparatively smaller module in the ecosystem. We needed a way to associate user accounts with WFO taxonomy with a regional hierarchy. We evaluated several options ([group](https://www.drupal.org/project/group), [permissions_by_term](https://www.drupal.org/project/permissions_by_term)) for this authorization schema and settled on WA for its simple model and user-friendly interface. Since we had enabled WA we decided to go ahead and also enable Workbench, since it ticked off several boxes in our user needs for the CMS. At the time we added it, full design of the CMS user interface was not complete, so time will tell if we continue to use Workbench as the guiding design for CMS user experience.

### (dev only) [`coder`](https://www.drupal.org/project/coder)

_Added in September 2023_

Part of our code standards, this module checks our Drupal code against coding standards and other best practices.

### (dev only) [`devel`](https://www.drupal.org/project/devel)

_Added in June 2023_

A very common dev-only module providing a range of helper functions and pages for Drupal developers.

### (dev only) [`phpunit`](https://www.drupal.org/project/phpunit)

_Added in October 2023_

How we run unit tests!

### (dev only) [`json-schema`](https://www.drupal.org/project/json_schema)

_Added in April 2024_

Part of a change with made to our unit tests for alerts. We needed to update the alert structure tests to use JSON schema validation, so we don't have to care as much about actual values, only the form of the values.
