# We will use Drupal 10 as our content management system

Date: 2023-09-19

### Status

Accepted

### Context

Having [chosen to use a CMS](#186), we must now choose which to use. We used the [CMS De-Risking strategy](https://docs.google.com/document/d/1sgsPErrR_HtVfljt7EK5fWMA8p9f2vKnn4GkRjRfboA/edit#heading=h.ljvidygtuupa) to guide us through the processes of market research and [feature comparison](https://docs.google.com/document/d/11hXeEy6265Ktqw878Klc6xEjxg4FcbrXLhhJHUOwr80/edit#heading=h.4j4znlyiitkv). We began from the assumption that we should use Drupal and asked what features we would be missing out by not using other options, then determining the value of those features.

### Decision

We will use Drupal 10.

### Consequences

We are bound to the Drupal plugin ecosystem. This is simply a fact, neither positive or negative.

We are bound to the PHP technology stack, including SQL databases (MariaDB or MySQL), Apache web server, Composer package management, etc.

It is easier to get Drupal to behave in a 12-factor-esque way than others we examined, which should give us more flexibility with our infrastructure architecture.

We will have to build a variety of Drupal data constructs:
- custom field types
- custom post/page types
- custom theme
- etc.

We may need to acquire a Drupal vendor for future maintenance.
