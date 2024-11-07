# Debugging

Our Drupal container runs with xdebug installed and configured for debugging and
coverage reporting. It should already be fully configured, so the only things
you'll need to configure are your local IDE.

This is also true for our API interop layer container. It enables the Node.js
inspector and forwards its port to the docker host.

If you're using Visual Studio, you can use the official
[xdebug plugin](https://github.com/xdebug/vscode-php-debug) and follow the
instructions there. The only things you should _need_ to change are the path
mappings from the container paths to your local path. Here's an example of a
complete `launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Interop layer",
      "address": "localhost",
      "port": 9229,
      "restart": true,
      "remoteRoot": "/app",
      "localRoot": "${workspaceFolder}/api-interop-layer"
    },
    {
      "name": "Drupal",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "pathMappings": {
        "/opt/drupal/web/sites": "${workspaceFolder}/web/sites",
        "/opt/drupal/web/modules": "${workspaceFolder}/web/modules",
        "/opt/drupal/web/themes": "${workspaceFolder}/web/themes",
        "/opt/drupal/web/core": "/Users/michaelgwalker/src/drupal/core"
      }
    }
  ]
}
```

Our container will also happily let you step into Drupal source code, if you
have it locally on your machine and setup path mappings for it. We recommend
cloning the Drupal source and checking out the appropriate tag that matches the
version we're using. Then, add these as additional items to the `pathMappings`
property above:

```json
"/opt/drupal/web/core": "/{path/to/drupal/source}/core"
```
