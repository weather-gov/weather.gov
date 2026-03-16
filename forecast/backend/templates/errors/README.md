# templates/errors

The purpose of this directory is to provide custom templates for site errors.

By default, Django provides automatic handling of several errors, including templates. Where we've chosen to override that behavior, we've:

1. Defined the handler  (`handler400`, `handler403`, `handler404`, or `handler500`) in backend.config.urls.
1. Written the handler function in backend.views.errors.
1. Placed a custom template in this directory.

This directory can also be used for error fragments (parts of a page that need to display an error), although it typically hasn't been.