# Development

## Getting started

We use Docker to take care of all the heavy lifting for setup and configuration
and we use [Just](https://github.com/casey/just) as a command runner to simplify
our most common needs with starting, clearing caches, importing/exporting,
configuration, etc.

To get up and running quickly with Docker, ensure you have Docker installed and
then:

1. Clone this repository into a new directory and `cd` into it.
2. Install [Just](https://github.com/casey/just?tab=readme-ov-file#packages).
3. Run `just init` from the command line.  
   This command will build all of the necessary containers, run database
   migrations, and populate the database with initial content (like lists of
   offices, extra alert safety information, etc.), and load our local spatial
   data.
   > [!NOTE]  
   > The initial content that is loaded can be modified later by Wagtail CMS
   > users. We have to be mindful not to overwrite data in our staging and
   > beta environments.
4. Browse to [http://localhost:8080](http://localhost:8080) in your broswer. You
   should see our front page! Congrats!
5. Run `just create-superuser` from the command line, then visit
   [http://localhost:8080/admin/login](http://localhost:8080/admin/login) to
   access the Wagtail admin console.

## Okay, you got it running. Now get to work!

1. Make sure you have [git commit signing configured](git-signing.md) for this
   repo or globally.
2. Read up on how we've [structured our Django code](django.md).
3. Learn about our [API interoperability layer](api-interop-layer.md).
4. Learn about [setting up debugging](debugging.md).
5. Learn about [replacing API calls with well-known data](intercepting-the-api.md)
   to see how we reproduce particular weather scenarios without needing to rely
   on the actual weather.
6. Check out our [expectations around code quality](qasp.md).
7. Look at [how we do testing](testing.md).
8. Look at our [process for submitting, reviewing, and merging new code](review-standards.md).
9. Get familiar with [our Just recipes](just-recipes.md). It'll be helpful!
10. Add our [code review templates](code_review_templates) to your [comment templates](comment-templates.md).
