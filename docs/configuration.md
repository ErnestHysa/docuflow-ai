# Configuration Reference

DocuFlow AI uses a `docuflow.config.json` file for configuration.

## Full Configuration Schema

```json
{
  "$schema": "https://docuflow.ai/schema/config.json",
  "scan": {
    "include": ["string array"],
    "exclude": ["string array"],
    "framework": "auto|express|fastify|nest|koa|hono"
  },
  "output": {
    "dir": "./docs",
    "formats": ["markdown", "html", "openapi", "json"],
    "theme": "auto|light|dark",
    "logoUrl": "https://example.com/logo.png",
    "customCss": "body { font-family: sans-serif; }"
  },
  "version": "1.0.0",
  "metadata": {
    "title": "My API Documentation",
    "description": "API documentation for My Project",
    "contact": {
      "name": "API Support",
      "email": "api@example.com",
      "url": "https://example.com/support"
    },
    "license": {
      "name": "MIT",
      "url": "https://opensource.org/licenses/MIT"
    }
  }
}
```

## Options

### `scan`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `include` | `string[]` | `["**/*.ts", "**/*.js"]` | Glob patterns for files to scan |
| `exclude` | `string[]` | `["**/*.test.ts", "**/node_modules/**"]` | Glob patterns for files to exclude |
| `framework` | `string` | `"auto"` | Framework to scan for (auto-detect if not specified) |

### `output`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dir` | `string` | `"./docs"` | Output directory for generated documentation |
| `formats` | `string[]` | `["markdown"]` | Export formats to generate |
| `theme` | `string` | `"auto"` | Theme for HTML output (auto, light, dark) |
| `logoUrl` | `string` | - | URL to logo for HTML output |
| `customCss` | `string` | - | Custom CSS to inject into HTML output |

### `metadata`

| Option | Type | Description |
|--------|------|-------------|
| `title` | `string` | API documentation title |
| `description` | `string` | API documentation description |
| `contact` | `object` | Contact information |
| `license` | `object` | License information |

## JSDoc Tags

DocuFlow AI supports JSDoc comments for additional documentation:

### Route Documentation

```typescript
/**
 * List all users
 * @tag Users
 * @auth bearer JWT
 * @summary Get all users
 * @param page - Page number
 * @param limit - Items per page
 * @returns 200 - Successful response
 * @returns 401 - Unauthorized
 */
router.get('/api/users', handler);
```

### Supported Tags

| Tag | Description |
|-----|-------------|
| `@tag` | Group endpoints by tag |
| `@auth` | Specify authentication type |
| `@summary` | Short summary |
| `@description` | Detailed description |
| `@param` | Document parameters |
| `@body` | Document request body |
| `@returns` | Document responses |
| `@deprecated` | Mark endpoint as deprecated |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DOCFLOW_CONFIG` | Path to config file |
| `DOCFLOW_DATA_DIR` | Directory for scan results |
| `DOCFLOW_OUTPUT_DIR` | Override output directory |
