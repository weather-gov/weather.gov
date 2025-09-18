# Our Django code layout

Our Django project is in the `forecast` directory of the repo root. The Django
code itself is then in the `backend` subdirectory. The `frontend` directory is
where all frontend code is stored, including raw Sass and uncompiled Javascript.

## Backend

The backend code generally follows typical Django patterns.

- Database models are defined in `models.py` and migrations and created and managed by Django.
- Supported URL routes are defined in `urls.py` along with links to the views that render them.
- View renderers are defined in `views.py`.
- HTML templates are located in the `templates/weather` directory.
- Custom template tag helpers are in the `templatetags` directory.

## Frontend

> [!NOTE]  
> Currently everything in the `assets` directory is served statically by Django
> at `http://<host>/public/`. This is temporary. This documentation wil lbe
> updated when our frontend build processes are established. For now, any static
> content that needs to be exposed can just be dropped into the appropriate
> subfolder. Style changes should be made in The `sass` folder and rebuilt; the
> CSS should not be edited directly.

## Extremely high-level system diagram

This used to be a more complicated diagram when we used Drupal because we diagrammed all of the modules and such as well. But we don't really have those breakdowns in the code anymore and Django kind of has well-known/expected ways of laying out code, so we don't really need to do as much of that documentation. Still, it felt wrong to just delete diagrams, so we updated it instead, even though it is now very simple.

![weather.gov software stack diagram](../architecture/diagrams/weather.gov%20software%20stack.png)
