# Installation Guide

DocuFlow AI can be installed and used in several ways depending on your needs.

## Prerequisites

- Node.js 20 or higher
- pnpm 8 or higher (for development)

## Option 1: CLI Installation (Recommended for Individuals)

Install the DocuFlow CLI globally:

```bash
npm install -g @docuflow/cli
# or
pnpm add -g @docuflow/cli
```

Then run:

```bash
docuflow init
```

## Option 2: Project Installation

Install as a development dependency in your project:

```bash
npm install -D @docuflow/cli
# or
pnpm add -D @docuflow/cli
```

Add to your `package.json`:

```json
{
  "scripts": {
    "docs:scan": "docuflow scan",
    "docs:generate": "docuflow generate",
    "docs:watch": "docuflow watch"
  }
}
```

## Option 3: Docker (Self-Hosted)

Pull the Docker image:

```bash
docker pull docuflowai/docuflow:latest
```

Run with docker-compose:

```bash
version: '3.8'
services:
  docuflow:
    image: docuflowai/docuflow:latest
    volumes:
      - ./:/workspace
    working_dir: /workspace
```

## Option 4: Build from Source

```bash
git clone https://github.com/docuflow-ai/docuflow.git
cd docuflow
pnpm install
pnpm build
pnpm link --global
```

## Quick Start

After installation:

```bash
# Initialize in your project
docuflow init

# Scan for API endpoints
docuflow scan

# Generate documentation
docuflow generate

# Watch for changes
docuflow watch
```

## Configuration

Create a `docuflow.config.json` file in your project root:

```json
{
  "$schema": "https://docuflow.ai/schema/config.json",
  "scan": {
    "include": ["src/**/*.ts"],
    "exclude": ["**/*.test.ts", "**/node_modules/**"]
  },
  "output": {
    "dir": "./docs",
    "formats": ["markdown", "html"],
    "theme": "auto"
  },
  "framework": "auto",
  "version": "1.0.0"
}
```

## Next Steps

- Read the [Configuration Reference](./docs/configuration.md)
- Check out the [CLI Reference](./docs/cli-reference.md)
- See [Integration Guides](./docs/integrations.md)
