# Syncing content between environments

> What does "environment" mean in this context, you ask? A fair question.
> Please see our [environemnts documentation](environments.md) for more
> information!

Sometimes we will create content in one environment while we're building it or
testing it, and then we'll need to move that content into another environment.
For example, we may begin by building in staging and then later want to publish
the same content into beta. We do not have any automated processes for doing
that right now, but we do have tools within Drupal to help so we don't have to
manually rebuild all the content in its new home.

> [!CAUTION]  
> **If you create or change a content type, display mode, layout, etc., those
> cannot be exported the same way. Those are considered configuration and are
> stored as part of our code repository so that they will be consistent across
> all environments. It is important to get the configuration changes deployed
> into an environment _before_ trying to synchronize the new content.**

### To export content

1. Log into the CMS
2. Navigate to the content management section. Depending on your permissions,
   you may have a link in the administrative toolbar that says "Content". If you
   do not, try these links (depending on your environment):
   - **Staging:** [https://weathergov-staging.app.cloud.gov/admin/content](https://weathergov-staging.app.cloud.gov/admin/content)
   - **Beta:** [https://beta.weather.gov/admin/content](https://beta.weather.gov/admin/content)
3. For each piece of content you want to export, find the button on the right
   side that says "Edit" with a downward arrow next to it. Click the down arrow
   to expand the options, then click "Export". From here, you can download the
   content as a single file, as a zip file, or you can copy it to the clipboard.

   > [!TIP]  
   > If you want to export multiple pieces of content at once, you can select
   > the checkbox on the left side of each item, scroll to the bottom of the
   > page, find the drop-down box labeled "Action", change it to "Export
   > content", and click the "Apply to selected items" button. This will cause
   > the page to reload and then there will be a link at the top to download a
   > zip file of all your content.

4. If you downloaded multiple individual files, you can zip them into a single
   file to make it easier to import later, but it is not necessary.

### To import content

1. Log into the CMS
2. Navigate to the content management section, as above
3. Click the "Import" tab
4. Click the "Browse" button to find the file you exported, then click the blue
   "Import" button.

   > [!TIP]  
   > If you copied the export to your clipboard, paste it into the text area
   > below the "Paste the content from the clipboard" label and then click
   > import.

5. If you exported multiple files and did not zip them together, you will repeat
   step 4 for each file.
