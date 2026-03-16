# templates/backend

[Wagtail documentation](https://docs.wagtail.org/en/stable/topics/writing_templates.html) explains the purpose of this directory.

> For each page model in models.py, Wagtail assumes an HTML template file exists of (almost) the same name.

> To find a suitable template, Wagtail converts CamelCase names to snake_case. So for a BlogPage model, a template blog_page.html will be expected. The name of the template file can be overridden per model if necessary.

Template files exist at `forecast/backend/templates/backend/<snake_case>.html`.