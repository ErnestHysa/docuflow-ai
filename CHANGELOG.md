# Changelog

All notable changes to DocuFlow AI will be documented in this file.

## [0.1.0] - 2026-03-11

### Added
- Initial release of DocuFlow AI
- Core parsing engine for API discovery
- Express.js route parser with JSDoc support
- Fastify route parser
- NestJS route parser
- CLI tool with commands: init, scan, generate, diff, watch, export
- Change detection engine with visual diff
- Documentation exporter (Markdown, HTML, OpenAPI, JSON)
- Storage layer with SQLite support
- Web UI with Next.js 14 and Tailwind CSS
- Docker support for self-hosting
- Sample Express.js application for testing

### Features
- Automatic API endpoint discovery
- JSDoc comment parsing
- Parameter extraction (path, query, header)
- Request/response schema detection
- Authentication detection (bearer, API key, basic, OAuth2)
- Breaking change detection
- Visual diff between API versions
- Automatic changelog generation
- Dark mode support in web UI
- Interactive API documentation
- Search and filtering

## [Unreleased]

### Planned
- VS Code extension
- GitHub App integration
- GitLab CI/CD integration
- Additional framework parsers (Koa, Hono, tRPC)
- Interactive API console in web UI
- Multi-language code examples
- Team collaboration features
- SSO and enterprise features
