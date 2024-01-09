# Development

## Getting started

We use Docker to take care of all the heavy lifting for setup and configuration
and we use a Makefile to simplify our most common needs with starting, clearing
caches, importing/exporting, configuration, etc.

To get up and running quickly with Docker, ensure you have Docker installed and
then:

1. Clone this repository into a new directory and `cd` into it.
2. Copy the file at `web/sites/example.settings.dev.php` to
   `web/sites/settings.dev.php` and make any necessary changes.
   > [!NOTE]  
   > As of this writing, no changes are necessary.
3. Run `make zap` from the command line.  
   This command will first attempt to destroy any weather.gov 2.0 containers you
   have, so you may notice some warnings on the command line. It is safe to
   ignore those warnings. After the warnings, it will build all of the necessary
   containers, create a Drupal site with our configuration, and populate the
   site with our content.
4. Run `npm ci` from the command line.  
   This installs our Javascript and Sass code linters and formatters, as well as
   Cypress, which is necessary for end-to-end and accessibility testing.
5. Browse to [http://localhost:8080](http://localhost:8080) in your broswer. You
   should see our front page! Congrats!
6. Browse to [http://localhost:8080/user/login](http://localhost:8080/user/login)
   to log in. Your username is `admin` and your password is `root`. Then you can
   do stuff!

## Okay, you got it running. Now get to work!

1. Make sure you have [git commit signing configured](git-signing.md) for this
   repo or globally.
2. Read up on how we've [structured our Drupal code](drupal.md).
3. Learn about [setting up debugging](debugging.md).
4. Learn about [replacing API calls with well-known data](intercepting-the-api.md)
   to see how we reproduce particular weather scenarios without needing to rely
   on the actual weather.
5. Check out our [expectations around code quality](qasp.md).
6. Look at [how we do testing](testing.md).
7. Look at our [process for submitting, reviewing, and merging new code](review-standards.md).
8. Get familiar with [our Makefile](makefile.md). It'll be helpful!
9. Add our [code review templates](code_review_templates) to your [saved replies](saved-replies.md).
