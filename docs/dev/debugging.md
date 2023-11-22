# Debugging

Our Drupal container runs with xdebug installed and configured for debugging and
coverage reporting. It should already be fully configured, so the only things
you'll need to configure are your local IDE.

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
      "name": "Listen for Xdebug",
      "type": "php",
      "request": "launch",
      "port": 9003,
      "pathMappings": {
        "/opt/drupal/web/sites": "${workspaceFolder}/web/sites",
        "/opt/drupal/web/modules": "${workspaceFolder}/web/modules",
        "/opt/drupal/web/themes": "${workspaceFolder}/web/themes"
      }
    }
  ]
}
```
