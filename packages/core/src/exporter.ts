/**
 * Documentation Exporter - Exports API documentation in various formats
 */

import type { ApiVersion, ApiDiff, ExportOptions, ExportFormat, ApiEndpoint } from './types/index.js';

/**
 * Export API documentation to various formats
 */
export class DocumentationExporter {
  /**
   * Export documentation
   */
  async export(version: ApiVersion, options: ExportOptions, diff?: ApiDiff): Promise<string> {
    switch (options.format) {
      case 'markdown':
        return this.exportMarkdown(version, options, diff);
      case 'html':
        return this.exportHtml(version, options, diff);
      case 'openapi':
        return this.exportOpenApi(version);
      case 'json':
        return this.exportJson(version, diff);
      default:
        throw new Error(`Unsupported format: ${options.format}`);
    }
  }

  /**
   * Export as Markdown
   */
  private exportMarkdown(version: ApiVersion, options: ExportOptions, diff?: ApiDiff): string {
    const lines: string[] = [];

    // Header
    lines.push(`# API Documentation\n`);
    lines.push(`**Version:** ${version.version}\n`);
    if (version.timestamp) {
      lines.push(`**Last Updated:** ${new Date(version.timestamp).toLocaleString()}\n`);
    }
    lines.push('');

    // Table of Contents
    lines.push(`## Table of Contents\n`);
    const grouped = this.groupByPath(version.endpoints);
    for (const [path, endpoints] of grouped) {
      lines.push(`- [${path}](#${this.slugify(path)})`);
    }
    lines.push('');

    // Endpoints by tag/group
    for (const [tag, endpoints] of grouped) {
      lines.push(`## ${tag}\n`);

      for (const endpoint of endpoints) {
        lines.push(this.renderEndpointMarkdown(endpoint));
        lines.push('');
      }
    }

    // Changelog if available
    if (diff && options.includeChanges) {
      lines.push(`## Changelog\n`);
      const { DiffEngine } = require('./diff.js');
      const engine = new DiffEngine();
      lines.push(engine.generateChangelog(diff));
    }

    return lines.join('\n');
  }

  /**
   * Render a single endpoint as Markdown
   */
  private renderEndpointMarkdown(endpoint: ApiEndpoint): string {
    const lines: string[] = [];

    const deprecated = endpoint.deprecated ? ' *(Deprecated)*' : '';
    lines.push(`### ${endpoint.method} ${endpoint.path}${deprecated}\n`);

    if (endpoint.summary) {
      lines.push(`${endpoint.summary}\n`);
    }

    if (endpoint.description) {
      lines.push(`${endpoint.description}\n`);
    }

    // Authentication
    if (endpoint.authentication.type !== 'none') {
      lines.push(`**Authentication:** \`${endpoint.authentication.type}\`\n`);
    }

    // Parameters
    if (endpoint.parameters.length > 0) {
      lines.push(`#### Parameters\n`);
      lines.push(`| Name | Type | Location | Required | Description |`);
      lines.push(`|------|------|----------|----------|-------------|`);
      for (const param of endpoint.parameters) {
        lines.push(
          `| \`${param.name}\` | ${param.type} | ${param.location} | ${param.required ? 'Yes' : 'No'} | ${param.description || '-'} |`
        );
      }
      lines.push('');
    }

    // Request Body
    if (endpoint.requestBody) {
      lines.push(`#### Request Body\n`);
      lines.push(`\`\`\`json`);
      lines.push(JSON.stringify(endpoint.requestBody.example || endpoint.requestBody, null, 2));
      lines.push(`\`\`\`\n`);
    }

    // Responses
    lines.push(`#### Responses\n`);
    for (const response of endpoint.responses) {
      lines.push(`**${response.statusCode}** - ${response.description}\n`);
      if (response.example) {
        lines.push(`\`\`\`json`);
        lines.push(JSON.stringify(response.example, null, 2));
        lines.push(`\`\`\`\n`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Export as HTML
   */
  private exportHtml(version: ApiVersion, options: ExportOptions, diff?: ApiDiff): string {
    const grouped = this.groupByPath(version.endpoints);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation - ${version.version}</title>
  <style>
    ${this.getBaseCss()}
    ${options.customCss || ''}
  </style>
</head>
<body class="theme-${options.theme || 'auto'}">
  <div class="container">
    <header>
      ${options.logoUrl ? `<img src="${options.logoUrl}" alt="Logo" class="logo">` : ''}
      <h1>API Documentation</h1>
      <p class="version">Version ${version.version}</p>
    </header>

    <nav class="sidebar">
      <h3>Endpoints</h3>
      <ul>
        ${Array.from(grouped.entries())
          .map(
            ([tag, endpoints]) => `
          <li><strong>${tag}</strong>
            <ul>
              ${endpoints.map((e: ApiEndpoint) => `<li><a href="#${this.slugify(e.method + e.path)}">${e.method} ${e.path}</a></li>`).join('')}
            </ul>
          </li>`
          )
          .join('')}
      </ul>
    </nav>

    <main class="content">
      ${Array.from(grouped.entries())
        .map(
          ([tag, endpoints]) => `
        <section id="${this.slugify(tag)}">
          <h2>${tag}</h2>
          ${endpoints.map((e: ApiEndpoint) => this.renderEndpointHtml(e)).join('')}
        </section>`
        )
        .join('')}
    </main>
  </div>

  <script>
    // Interactive features
    document.querySelectorAll('.method-badge').forEach(badge => {
      badge.className = 'method-badge ' + badge.textContent.toLowerCase();
    });
  </script>
</body>
</html>`;
  }

  /**
   * Render a single endpoint as HTML
   */
  private renderEndpointHtml(endpoint: ApiEndpoint): string {
    return `
    <article class="endpoint" id="${this.slugify(endpoint.method + endpoint.path)}">
      <h3>
        <span class="method-badge">${endpoint.method}</span>
        <code class="path">${endpoint.path}</code>
        ${endpoint.deprecated ? '<span class="deprecated">Deprecated</span>' : ''}
      </h3>

      ${endpoint.summary ? `<p class="summary">${endpoint.summary}</p>` : ''}
      ${endpoint.description ? `<p class="description">${endpoint.description}</p>` : ''}

      ${endpoint.authentication.type !== 'none' ? `<div class="auth"><strong>Authentication:</strong> <code>${endpoint.authentication.type}</code></div>` : ''}

      ${endpoint.parameters.length > 0 ? this.renderParametersHtml(endpoint.parameters) : ''}

      ${endpoint.requestBody ? this.renderRequestBodyHtml(endpoint.requestBody) : ''}

      ${this.renderResponsesHtml(endpoint.responses)}
    </article>`;
  }

  /**
   * Render parameters as HTML
   */
  private renderParametersHtml(parameters: ApiEndpoint['parameters']): string {
    return `
    <div class="parameters">
      <h4>Parameters</h4>
      <table>
        <thead>
          <tr><th>Name</th><th>Type</th><th>Location</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          ${parameters
            .map(
              (p: ApiEndpoint['parameters'][0]) => `
            <tr>
              <td><code>${p.name}</code></td>
              <td>${p.type}</td>
              <td>${p.location}</td>
              <td>${p.required ? '✓' : '✗'}</td>
              <td>${p.description || '-'}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
  }

  /**
   * Render request body as HTML
   */
  private renderRequestBodyHtml(body: NonNullable<ApiEndpoint['requestBody']>): string {
    return `
    <div class="request-body">
      <h4>Request Body</h4>
      <pre><code>${JSON.stringify(body.example || body, null, 2)}</code></pre>
    </div>`;
  }

  /**
   * Render responses as HTML
   */
  private renderResponsesHtml(responses: ApiEndpoint['responses']): string {
    return `
    <div class="responses">
      <h4>Responses</h4>
      ${responses
        .map(
          (r: ApiEndpoint['responses'][0]) => `
        <div class="response status-${r.statusCode}">
          <h5>${r.statusCode} ${r.description}</h5>
          ${r.example ? `<pre><code>${JSON.stringify(r.example, null, 2)}</code></pre>` : ''}
        </div>`
        )
        .join('')}
    </div>`;
  }

  /**
   * Export as OpenAPI 3.1 specification
   */
  private exportOpenApi(version: ApiVersion): string {
    const openApi = {
      openapi: '3.1.0',
      info: {
        title: 'API Documentation',
        version: version.version,
      },
      paths: this.buildOpenApiPaths(version.endpoints),
      components: {
        schemas: this.buildOpenApiSchemas(version.endpoints),
      },
    };

    return JSON.stringify(openApi, null, 2);
  }

  /**
   * Build OpenAPI paths object
   */
  private buildOpenApiPaths(endpoints: ApiEndpoint[]) {
    const paths: Record<string, any> = {};

    for (const endpoint of endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.summary || '',
        description: endpoint.description || '',
        parameters: endpoint.parameters.map((p) => ({
          name: p.name,
          in: p.location,
          required: p.required,
          schema: { type: p.type.toLowerCase() },
          description: p.description || '',
        })),
        requestBody: endpoint.requestBody
          ? {
              content: {
                'application/json': {
                  schema: endpoint.requestBody,
                },
              },
            }
          : undefined,
        responses: Object.fromEntries(
          endpoint.responses.map((r) => [
            r.statusCode.toString(),
            {
              description: r.description,
              content: r.schema
                ? {
                    'application/json': {
                      schema: r.schema,
                    },
                  }
                : undefined,
            },
          ])
        ),
        tags: endpoint.tags,
        deprecated: endpoint.deprecated,
      };
    }

    return paths;
  }

  /**
   * Build OpenAPI schemas (placeholder)
   */
  private buildOpenApiSchemas(endpoints: ApiEndpoint[]): Record<string, any> {
    return {};
  }

  /**
   * Export as JSON
   */
  private exportJson(version: ApiVersion, diff?: ApiDiff): string {
    const data = {
      version: version.version,
      timestamp: version.timestamp,
      endpoints: version.endpoints,
      diff: diff,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Group endpoints by tag/path
   */
  private groupByPath(endpoints: ApiEndpoint[]): Map<string, ApiEndpoint[]> {
    const grouped = new Map<string, ApiEndpoint[]>();

    for (const endpoint of endpoints) {
      const tag = endpoint.tags[0] || 'General';
      if (!grouped.has(tag)) {
        grouped.set(tag, []);
      }
      grouped.get(tag)!.push(endpoint);
    }

    return grouped;
  }

  /**
   * Slugify a string for URL hashes
   */
  private slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get base CSS for HTML export
   */
  private getBaseCss(): string {
    return `
:root {
  --color-primary: #3b82f6;
  --color-success: #22c55e;
  --color-danger: #ef4444;
  --color-warning: #f59e0b;
  --color-bg: #ffffff;
  --color-text: #1f2937;
  --color-border: #e5e7eb;
  --color-code-bg: #f3f4f6;
}

body.theme-dark {
  --color-bg: #1f2937;
  --color-text: #f9fafb;
  --color-border: #374151;
  --color-code-bg: #111827;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
}

.container {
  display: grid;
  grid-template-columns: 250px 1fr;
  min-height: 100vh;
}

header {
  grid-column: 1 / -1;
  padding: 2rem;
  border-bottom: 1px solid var(--color-border);
}

.logo { max-height: 40px; vertical-align: middle; margin-right: 1rem; }

.sidebar {
  padding: 1rem;
  border-right: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

.sidebar h3 { margin-bottom: 1rem; font-size: 0.875rem; text-transform: uppercase; color: var(--color-text); opacity: 0.7; }
.sidebar ul { list-style: none; }
.sidebar li { margin: 0.5rem 0; }
.sidebar a { color: var(--color-text); text-decoration: none; }
.sidebar a:hover { color: var(--color-primary); }

.content { padding: 2rem; max-width: 900px; }

.endpoint { margin-bottom: 3rem; padding: 1.5rem; border: 1px solid var(--color-border); border-radius: 8px; }
.endpoint:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }

.method-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}

.method-badge.get { background: var(--color-success); color: white; }
.method-badge.post { background: var(--color-primary); color: white; }
.method-badge.put { background: var(--color-warning); color: white; }
.method-badge.delete { background: var(--color-danger); color: white; }
.method-badge.patch { background: #8b5cf6; color: white; }

.path { background: var(--color-code-bg); padding: 0.25rem 0.5rem; border-radius: 4px; }
.deprecated { background: var(--color-warning); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }

table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--color-border); }
th { font-weight: 600; font-size: 0.875rem; }

pre { background: var(--color-code-bg); padding: 1rem; border-radius: 4px; overflow-x: auto; }
code { font-family: "SF Mono", Monaco, monospace; font-size: 0.875rem; }

.auth { padding: 0.5rem; background: var(--color-code-bg); border-radius: 4px; margin: 1rem 0; }
    `.trim();
  }
}
