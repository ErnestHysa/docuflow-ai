/**
 * Next.js App Router Parser
 * Scans Next.js App Router API routes (route.ts, route.js files)
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, basename, extname, relative } from 'path';
import type { ApiEndpoint, HttpMethod, Parameter, Schema, Response, Authentication } from '@docuflow/core';

export interface NextJSParserOptions {
  cwd: string;
  config: {
    includePatterns?: string[];
    excludePatterns?: string[];
    [key: string]: any;
  };
}

// HTTP methods supported in Next.js route handlers
const ROUTE_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export class NextJSParser {
  private options: NextJSParserOptions;

  constructor(options: NextJSParserOptions) {
    this.options = options;
  }

  /**
   * Parse a single route file for Next.js API endpoints
   */
  parseFile(filePath: string): ApiEndpoint[] {
    if (!existsSync(filePath)) {
      return [];
    }

    // Only parse route.ts/route.js files
    const fileName = basename(filePath);
    if (!fileName.startsWith('route.')) {
      return [];
    }

    const content = readFileSync(filePath, 'utf-8');
    const endpoints: ApiEndpoint[] = [];

    // Determine the route path from the file path
    // e.g., src/app/api/users/[id]/route.ts -> /api/users/:id
    const routePath = this.getRoutePath(filePath, this.options.cwd);

    // Extract exported HTTP methods
    const exportedMethods = this.extractExportedMethods(content, filePath);

    for (const method of exportedMethods) {
      endpoints.push({
        id: `${method}:${routePath}`,
        method,
        path: routePath,
        summary: `${method} ${routePath}`,
        description: this.extractDescription(content, method),
        tags: this.extractTags(content, filePath),
        parameters: this.extractPathParams(routePath),
        requestBody: method === 'GET' || method === 'HEAD' ? undefined : {
          type: 'object',
          description: 'Request body',
        },
        responses: this.extractResponses(content, method),
        authentication: { type: 'none' },
        deprecated: false,
        sourceFile: filePath,
        sourceLine: this.findMethodLine(content, method),
        metadata: {
          framework: 'nextjs',
          routeType: 'app',
          isDynamic: routePath.includes(':'),
        },
      });
    }

    return endpoints;
  }

  /**
   * Get the API route path from file path
   */
  private getRoutePath(filePath: string, cwd: string): string {
    const relPath = relative(cwd, filePath);

    // Extract path from: src/app/api/users/[id]/route.ts
    // Remove 'route.ts' and find the api directory
    let routePart = relPath.replace(/\\/g, '/');

    // Find the 'app' or 'src/app' directory
    const appDirIndex = routePart.indexOf('/app/');
    const srcAppDirIndex = routePart.indexOf('/src/app/');

    let startIndex = 0;
    if (srcAppDirIndex !== -1) {
      startIndex = srcAppDirIndex + '/src/app/'.length;
    } else if (appDirIndex !== -1) {
      startIndex = appDirIndex + '/app/'.length;
    }

    routePart = routePart.substring(startIndex);

    // Remove 'route.ts' or 'route.js'
    routePart = routePart.replace(/route\.(ts|js|tsx|jsx)$/, '');

    // Convert [param] to :param
    routePart = routePart.replace(/\[([^\]]+)\]/g, ':$1');

    // Convert [[...param]] to :param* (catch-all)
    routePart = routePart.replace(/\[\[\.\.\.([^\]]+)\]\]/g, ':$1*');

    // Convert [...param] to :param+ (required catch-all)
    routePart = routePart.replace(/\[\.\.\.([^\]]+)\]/g, ':$1+');

    // Ensure leading slash
    return '/' + routePart.replace(/\/+/g, '/').replace(/\/$/, '');
  }

  /**
   * Extract exported HTTP method names from the file
   */
  private extractExportedMethods(content: string, filePath: string): HttpMethod[] {
    const methods: HttpMethod[] = [];

    // Look for named exports of HTTP methods
    // export async function GET(request) { }
    // export const POST = async (request) => { }
    for (const method of ROUTE_METHODS) {
      const patterns = [
        // export function METHOD(
        new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`),
        // export const METHOD =
        new RegExp(`export\\s+const\\s+${method}\\s*=`),
        // export { METHOD as GET }
        new RegExp(`export\\s+{[^}]*\\b${method}\\b`),
      ];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          methods.push(method);
          break;
        }
      }
    }

    return methods;
  }

  /**
   * Extract description from JSDoc comments
   */
  private extractDescription(content: string, method: string): string | undefined {
    // Look for JSDoc before the method export
    const methodPattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(`);
    const match = content.match(methodPattern);

    if (match && match.index !== undefined) {
      // Look backwards for JSDoc
      const before = content.substring(0, match.index);
      const jsdocMatch = before.match(/\/\*\*[\s\S]*?\*\//);
      if (jsdocMatch) {
        // Extract description text
        const desc = jsdocMatch[0]
          .replace(/\/\*\*|\*\//g, '')
          .split('\n')
          .map(line => line.trim().replace(/^\*\s?/, ''))
          .filter(line => line && !line.startsWith('@'))
          .join(' ')
          .trim();
        return desc || undefined;
      }
    }

    return undefined;
  }

  /**
   * Extract tags from comments or file path
   */
  private extractTags(content: string, filePath: string): string[] {
    const tags: string[] = [];

    // Extract from path
    const parts = filePath.split(/[/\\]/);
    const apiIndex = parts.findIndex(p => p === 'api');

    if (apiIndex !== -1 && apiIndex + 1 < parts.length) {
      // Use the next segment as a tag
      const tag = parts[apiIndex + 1];
      if (tag && tag !== '[...') {
        tags.push(tag.charAt(0).toUpperCase() + tag.slice(1));
      }
    }

    if (tags.length === 0) {
      tags.push('API');
    }

    return tags;
  }

  /**
   * Extract path parameters from route path
   */
  private extractPathParams(path: string): Parameter[] {
    const params: Parameter[] = [];

    // Find :param patterns
    const paramPattern = /:([a-zA-Z_][a-zA-Z0-9_]*)([+*])?/g;
    let match;

    while ((match = paramPattern.exec(path)) !== null) {
      const name = match[1];
      const modifier = match[2];

      params.push({
        name,
        type: 'string',
        location: 'path',
        required: modifier !== '*',  // * means optional catch-all
        description: `Path parameter "${name}"`,
      });
    }

    return params;
  }

  /**
   * Extract response information
   */
  private extractResponses(content: string, method: string): Response[] {
    const responses: Response[] = [
      { statusCode: 200, description: 'Success' },
    ];

    // Look for NextResponse.json() or Response.json() patterns
    const successMatch = content.match(/NextResponse\.json\s*\(\s*{[\s\S]*?status:\s*(\d+)/);
    if (successMatch) {
      responses[0].statusCode = parseInt(successMatch[1], 10);
    }

    // Look for error responses
    const errorMatch = content.match(/return\s+NextResponse\.json\s*\([^)]*,\s*{\s*status:\s*(\d+)/g);
    if (errorMatch) {
      for (const m of errorMatch) {
        const statusMatch = m.match(/status:\s*(\d+)/);
        if (statusMatch && parseInt(statusMatch[1], 10) >= 400) {
          responses.push({
            statusCode: parseInt(statusMatch[1], 10),
            description: 'Error response',
          });
        }
      }
    }

    return responses;
  }

  /**
   * Find the line number where a method is defined
   */
  private findMethodLine(content: string, method: string): number {
    const lines = content.split('\n');
    const pattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(|export\\s+const\\s+${method}\\s*=`);

    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        return i + 1;
      }
    }

    return 1;
  }

  /**
   * Find all route files in a directory
   */
  private findRouteFiles(dirPath: string): string[] {
    const routeFiles: string[] = [];

    if (!existsSync(dirPath)) {
      return routeFiles;
    }

    const scanDir = (currentPath: string) => {
      try {
        const entries = readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(currentPath, entry.name);

          if (entry.isDirectory()) {
            // Skip common directories to ignore
            if (!entry.name.startsWith('.') &&
                entry.name !== 'node_modules' &&
                entry.name !== '.next' &&
                entry.name !== 'dist' &&
                entry.name !== 'build') {
              scanDir(fullPath);
            }
          } else if (entry.isFile() && entry.name.startsWith('route.')) {
            const ext = extname(entry.name);
            if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
              routeFiles.push(fullPath);
            }
          }
        }
      } catch (e) {
        // Ignore permission errors
      }
    };

    scanDir(dirPath);
    return routeFiles;
  }
}

/**
 * Factory function
 */
export function createNextJSParser(options: NextJSParserOptions): NextJSParser {
  return new NextJSParser(options);
}
