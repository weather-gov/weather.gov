# Architectural Diagrams

We use PlantUML for diagraming our architecture.

You can use the [VS Code plugin](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml)
for generating the diagrams from configuration stored in this git repository.
Diagrams will be stored in PlantUML and as images in the
docs/architecutre/diagrams folder.

This plugin works best when running PlantUML as a server. Our project includes
a PlantUML server in our Docker composer, so you can use that rather than
figuring out how to get Java working properly. (Our Docker setup also adds
zscaler root certificates to the container so it'll work on GSA computers.)

```shell
docker compose run --service-ports plantuml
```

Then in the plugin settings, set the **Render** setting to `PlantUMLServer` and
set the **Server** setting to `http://localhost:8180`.
