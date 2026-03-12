# CLI Reference

## Commands

### `docuflow init`

Initialize DocuFlow configuration in your project.

```bash
docuflow init [options]
```

**Options:**
- `-y, --yes` - Skip prompts with defaults

**Example:**
```bash
docuflow init
```

---

### `docuflow scan`

Scan your codebase for API endpoints.

```bash
docuflow scan [options]
```

**Options:**
- `-c, --config <path>` - Path to config file (default: `docuflow.config.json`)
- `-o, --output <path>` - Output file for scan results (JSON)
- `--include <patterns...>` - Files to include
- `--exclude <patterns...>` - Files to exclude

**Example:**
```bash
docuflow scan
docuflow scan --include "src/**/*.ts" --output scan-results.json
```

---

### `docuflow generate`

Generate documentation from scan results.

```bash
docuflow generate [options]
```

**Options:**
- `-c, --config <path>` - Path to config file
- `-o, --output <path>` - Output directory
- `-f, --format <format>` - Output format (markdown, html, openapi, json)
- `--include-changes` - Include changelog if diff available

**Example:**
```bash
docuflow generate
docuflow generate -f html
docuflow generate --include-changes
```

---

### `docuflow diff`

Show API changes between versions.

```bash
docuflow diff [options]
```

**Options:**
- `--from <version>` - Previous version (default: last saved)
- `--to <version>` - Current version (default: current scan)
- `-f, --format <format>` - Output format (text, markdown, json)

**Example:**
```bash
docuflow diff
docuflow diff --from 1.0.0 --to 1.1.0
docuflow diff -f markdown > changelog.md
```

---

### `docuflow watch`

Watch for file changes and auto-regenerate documentation.

```bash
docuflow watch [options]
```

**Options:**
- `-c, --config <path>` - Path to config file
- `-o, --output <path>` - Output directory
- `--delay <ms>` - Debounce delay in milliseconds (default: 500)

**Example:**
```bash
docuflow watch
```

---

### `docuflow export`

Export documentation in various formats.

```bash
docuflow export <format> [options]
```

**Arguments:**
- `<format>` - Export format: markdown, html, openapi, json

**Options:**
- `-o, --output <path>` - Output file path
- `--open` - Open the exported file

**Example:**
```bash
docuflow export html
docuflow export openapi -o api-spec.json --open
```

## Global Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help |
| `-v, --version` | Show version number |

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Error occurred |
| 2 | No scan results found |

## Examples

### Typical Workflow

```bash
# 1. Initialize
docuflow init

# 2. Scan your codebase
docuflow scan

# 3. Generate docs
docuflow generate -f html

# 4. Watch for changes (development)
docuflow watch
```

### CI/CD Integration

```bash
# In your CI pipeline
docuflow scan
docuflow generate -f openapi -o docs/openapi.json
docuflow diff --from $LAST_VERSION --to $CURRENT_VERSION -f json > diff.json
```

### Multiple Formats

```bash
# Generate all formats
docuflow generate -f markdown
docuflow generate -f html
docuflow generate -f openapi -o api-spec.json
```
