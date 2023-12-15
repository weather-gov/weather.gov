# Syncing content between environments

Sometimes we will create content in one environment while we're building it or
testing it, and then we'll need to move that content into another environment.
For example, we may begin by building in staging and then later want to publish
the same content into beta. We do not have any automated processes for doing
that right now, but we do have tools within Drupal to help so we don't have to
manually rebuild all the content in its new home.

### Content

> [!NOTE]  
> For the purposes of this document, content is defined as the things created
> from Drupal's content page (at `/admin/content`). This could be pages, nodes,
> or blocks. If you have created or modified a _content type_, layout, or
> similar, that is a configuration change. You can sync those too, but the
> process is different. See the next section!

**To export content:**

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

   > [!NOTE]  
   > If you want to export multiple pieces of content at once, you can select
   > the checkbox on the left side of each item, scroll to the bottom of the
   > page, find the drop-down box labeled "Action", change it to "Export
   > content", and click the "Apply to selected items" button. This will cause
   > the page to reload and then there will be a link at the top to download a
   > zip file of all your content.

4. If you downloaded multiple individual files, you can zip them into a single
   file to make it easier to import later, but it is not necessary.

**To import content:**

1. Log into the CMS
2. Navigate to the content management section, as above
3. Click the "Import" tab
4. Click the "Browse" button to find the file you exported, then click the blue
   "Import" button.

   > [!NOTE]  
   > If you copied the export to your clipboard, paste it into the text area
   > below the "Paste the content from the clipboard" label and then click
   > import.

5. If you exported multiple files and did not zip them together, you will repeat
   step 4 for each file.

### Configuration

If you create or change a content type, display mode, layout, etc., those cannot
be exported the same way. Those are considered configuration and are stored as
part of our code repository so that they will be consistent across all
environments. It is important to get the configuration changes deployed into an
environment **_before_** trying to synchronize the new content.

You will need to have this repo checked out locally as well. The exported
configuration files need to be added as a new commit and put through our code
review process in order to be deployed into other environments. There's more,
though possibly not entirely helpful, documentation in our [developer
documentation](index.md).

1. Delete all of the `.yml` files inside the `web/config/` directory of our
   repo. These are the existing configuration settings. Deleting them ensures
   that any content types, modules, etc. that you removed won't accidentally be
   preserved.
2. Log into the CMS
3. Navigate to the configuration export settings:
   - **Staging**: [https://weathergov-staging.app.cloud.gov/admin/config/development/configuration/full/export](https://weathergov-staging.app.cloud.gov/admin/config/development/configuration/full/export)
   - **Beta**: [https://beta.weather.gov/admin/config/development/configuration/full/export](https://beta.weather.gov/admin/config/development/configuration/full/export)
4. Click the "Export" button
5. A `.tar.gz` file will be downloaded. This is similar to a zip file. Inside it
   are individual configuration files representing the entire configured state
   of the CMS, including all of the content types, their view settings, layouts,
   and so on.
6. Decompress the file and copy all of the `.yml` files into the `web/config/`
   directory of our repo.
7. Commit the new files, push them to GitHub, and open a pull request to have
   them reviewed, merged, and deployed.

The configuration will automatically be imported when we deploy.
