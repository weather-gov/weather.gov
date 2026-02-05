# Weather.gov 2.0 Documentation

Welcome to the documentation for the Weather.gov 2.0 project.

## Getting Started

If you are new to the project, start with the [Development Guide](dev/index.md). It covers:
- Setting up your environment with Docker and Just.
- Running the application locally.
- Code organization and standards.

## Key Sections

- **[Development](dev/index.md)**: Guides for developers, including setup, debugging, and testing.
- **[API Interop Layer](dev/api-interop/index.md)**: Documentation for the middleware layer, including technical details and schema definitions.
- **[Architecture](architecture/decisions/index.md)**: Decision records and diagrams.
- **[Product](product/roadmap.md)**: Roadmaps and release info.
- **[Changelog](CHANGELOG.md)**: History of changes to the project.

## Contributing

We use **[Conventional Commits](https://www.conventionalcommits.org/)** for our commit messages. This allows us to automatically generate the changelog. Please follow this convention when making changes.

## Running this Documentation

To serve this documentation locally, run:

```bash
npm run docs:serve
```

Or using `just`:

```bash
just serve-docs
```
