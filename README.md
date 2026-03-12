# DocuFlow AI

> **Documentation that writes itself and shows you exactly what changed**

AI-Powered API Documentation Generator with Live Change Detection for modern API development.

[![npm version](https://badge.fury.io/js/%40docuflow%2Fcli.svg)](https://www.npmjs.com/package/@docuflow/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/docuflow-ai/docuflow/workflows/CI/badge.svg)](https://github.com/docuflow-ai/docuflow/actions)

## ✨ Features

### Core Capabilities
- 🔄 **Automatic API Discovery** - Scans Express, Fastify, Nest.js routes automatically
- 📊 **Visual Change Detection** - See exactly what changed with beautiful diffs
- 🎨 **Beautiful Documentation** - Generate Markdown, HTML, or OpenAPI specs
- 🔒 **Self-Hostable** - Docker deployment, data stays yours
- 💻 **CLI-First** - Integrates into your existing workflow
- ⚡ **Watch Mode** - Auto-regenerate docs as you code

### Export Formats
- 📄 **Markdown** - Perfect for GitHub READMEs
- 🌐 **HTML** - Styled, searchable documentation sites
- 📋 **OpenAPI 3.1** - Standard API specification
- 🔧 **JSON** - For integrations and custom processing

### Framework Support
- Express.js
- Fastify
- NestJS
- More coming soon (Koa, Hono, tRPC)

## 🚀 Quick Start

```bash
# Install CLI globally
npm install -g @docuflow/cli

# Initialize in your project
docuflow init

# Scan your codebase
docuflow scan

# Generate documentation
docuflow generate

# Watch for changes (development)
docuflow watch
```

## 📸 Screenshots

### Change Detection
![Change Detection](https://docuflow.ai/images/diff.png)

### Web Documentation
![Web UI](https://docuflow.ai/images/web-ui.png)

## 📖 Usage

### CLI Commands

| Command | Description |
|---------|-------------|
| `docuflow init` | Initialize configuration |
| `docuflow scan` | Scan for API endpoints |
| `docuflow generate` | Generate documentation |
| `docuflow diff` | Show API changes |
| `docuflow watch` | Watch mode for auto-generation |
| `docuflow export` | Export to various formats |

### Configuration

Create `docuflow.config.json`:

```json
{
  "$schema": "https://docuflow.ai/schema/config.json",
  "scan": {
    "include": ["src/**/*.ts"],
    "exclude": ["**/*.test.ts"]
  },
  "output": {
    "dir": "./docs",
    "formats": ["markdown", "html"]
  },
  "framework": "auto"
}
```

### Annotating Your Routes

DocuFlow AI extracts information from JSDoc comments:

```typescript
/**
 * List all users
 * @tag Users
 * @auth bearer JWT
 * @param page - Page number for pagination
 * @returns 200 - Successful response with user list
 */
router.get('/api/users', async (req, res) => {
  // handler code
});
```

## 🔄 Change Detection

See exactly what changed between API versions:

```bash
docuflow diff --from 1.0.0 --to 1.1.0
```

Output:
```
📊 API Changes: 1.0.0 → 1.1.1

Summary:
  +2 added
  -1 removed
  ~3 modified
  ⚠️ 1 breaking
  Semver recommendation: major

⚠️ Breaking Changes:
  ● POST /api/users
      Path changed from /api/users to /api/v2/users

✨ Added:
  + GET /api/v2/users
  + GET /api/v2/users/:id

🗑️ Removed:
  - GET /api/legacy/users
```

## 🐳 Docker

Self-host with Docker:

```bash
docker pull docuflowai/docuflow:latest

# Scan and generate docs
docker run --rm -v $(pwd):/workspace docuflowai/docuflow scan
docker run --rm -v $(pwd):/workspace docuflowai/docuflow generate -f html
```

Or use docker-compose:

```yaml
services:
  docuflow:
    image: docuflowai/docuflow:latest
    volumes:
      - ./:/workspace
    working_dir: /workspace
```

## 📦 Installation

### NPM
```bash
npm install -g @docuflow/cli
```

### pnpm
```bash
pnpm add -g @docuflow/cli
```

### Docker
```bash
docker pull docuflowai/docuflow:latest
```

### Build from Source
```bash
git clone https://github.com/docuflow-ai/docuflow.git
cd docuflow
pnpm install
pnpm build
pnpm link --global
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Built with:
- [TypeScript](https://www.typescriptlang.org/)
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [tree-sitter](https://tree-sitter.github.io/)

---

**Made with ❤️ for developers who hate writing docs**

[Website](https://docuflow.ai) • [Documentation](https://docs.docuflow.ai) • [GitHub](https://github.com/docuflow-ai/docuflow) • [Twitter](https://twitter.com/docuflowai)
