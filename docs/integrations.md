# Integration Guides

## GitHub Actions

Create `.github/workflows/docs.yml`:

```yaml
name: Generate API Documentation

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install DocuFlow
        run: npm install -g @docuflow/cli

      - name: Scan APIs
        run: docuflow scan

      - name: Generate docs
        run: docuflow generate -f html

      - name: Commit docs
        run: |
          git config user.name "Doc Bot"
          git config user.email "bot@example.com"
          git add docs/
          git commit -m "Update API documentation" || true
          git push
```

## VS Code Extension

Install the DocuFlow VS Code extension for inline documentation.

Features:
- Syntax highlighting for API routes
- Go-to-definition for endpoints
- Inline documentation preview
- Change indicators in editor

## GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - docs

generate-docs:
  stage: docs
  image: node:20
  script:
    - npm install -g @docuflow/cli
    - docuflow scan
    - docuflow generate
  artifacts:
    paths:
      - docs/
  only:
    - main
```

## Docker Integration

Add to your `Dockerfile`:

```dockerfile
FROM node:20-alpine AS docs
WORKDIR /app
COPY . .
RUN npm install -g @docuflow/cli
RUN docuflow scan && docuflow generate -f html

# Use docs in production stage
FROM nginx:alpine
COPY --from=docs /app/docs /usr/share/nginx/html/docs
```

## Next.js Integration

Create API route to serve docs:

```typescript
// app/api/docs/route.ts
import { NextResponse } from 'next/server';
import { DocumentationExporter } from '@docuflow/core';

export async function GET() {
  const scanResults = await import('../../../.docuflow/scan-results.json');
  const exporter = new DocumentationExporter();

  const html = await exporter.export(scanResults, {
    format: 'html',
    outputPath: '/dev/null',
  });

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
```

## Express Middleware

Serve docs from your Express app:

```typescript
import express from 'express';
import { DocumentationExporter } from '@docuflow/core';

const app = express();

app.get('/docs', async (req, res) => {
  const exporter = new DocumentationExporter();
  const scanResults = await import('./.docuflow/scan-results.json');

  const html = await exporter.export(scanResults.default, {
    format: 'html',
    outputPath: '/dev/null',
  });

  res.send(html);
});
```

## Webhook Integration

Listen for DocuFlow webhooks:

```typescript
import express from 'express';

const app = express();
app.use(express.json());

app.post('/webhook/docuflow', (req, res) => {
  const { event, data } = req.body;

  switch (event) {
    case 'scan:complete':
      console.log(`Found ${data.endpointCount} endpoints`);
      break;
    case 'breaking:change':
      console.log(`Breaking change detected: ${data.change}`);
      break;
  }

  res.sendStatus(200);
});
```

## Custom Parsers

Create a custom parser:

```typescript
import { createExpressParser } from '@docuflow/parser-express';

const parser = createExpressParser({
  cwd: process.cwd(),
  config: {
    includePatterns: ['src/**/*.ts'],
    excludePatterns: ['**/*.test.ts'],
  },
});

const endpoints = parser.parseFile('src/routes/users.ts');
console.log(endpoints);
```
