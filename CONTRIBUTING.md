# Contributing to DocuFlow AI

Thank you for your interest in contributing! We welcome contributions from the community.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/docuflow-ai/docuflow.git
cd docuflow

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Link CLI for local development
pnpm --filter @docuflow/cli link
```

## Project Structure

```
docuflow-ai/
├── packages/
│   ├── core/              # Core engine
│   ├── cli/               # CLI tool
│   ├── ui/                # Web documentation viewer
│   ├── parser-express/    # Express.js parser
│   ├── parser-fastify/    # Fastify parser
│   ├── parser-nest/       # NestJS parser
│   ├── storage/           # Storage layer
│   └── diff/              # Change detection
├── tests/
│   └── sample-express-app/  # Sample app for testing
└── docs/                  # Documentation
```

## Adding a New Parser

1. Create a new package under `packages/parser-{framework}/`
2. Implement the parser interface
3. Add tests
4. Update the core scanner to detect the framework

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Write tests for new features
- Update documentation

## Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
