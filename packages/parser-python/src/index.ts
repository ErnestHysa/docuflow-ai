/**
 * Python FastAPI Parser
 * Scans Python FastAPI files for API endpoints
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import type { ApiEndpoint, HttpMethod, Parameter, Schema, Response, Authentication } from '@docuflow/core';

export interface PythonParserOptions {
  cwd: string;
  config: {
    includePatterns?: string[];
    excludePatterns?: string[];
    [key: string]: any;
  };
}

interface FastAPIDecorator {
  name: string; // get, post, put, delete, etc.
  path: string; // route path
  function?: string; // function name (optional)
  line?: number;
  hasBody?: boolean;
  summary?: string;
  description?: string;
}

export class PythonFastAPIParser {
  private options: PythonParserOptions;

  constructor(options: PythonParserOptions) {
    this.options = options;
  }

  /**
   * Parse a single Python file for FastAPI routes
   */
  parseFile(filePath: string): ApiEndpoint[] {
    if (!existsSync(filePath)) {
      return [];
    }

    const content = readFileSync(filePath, 'utf-8');
    const endpoints: ApiEndpoint[] = [];

    // Find all @app.get/post/put/delete and @router.get/post/put/delete patterns
    const patterns = [
      // Standard FastAPI: @app.get("/path"), @app.post("/path")
      // FastAPI with specific app instance
      /@(\w+\.)?(?:app|api|router)\.(get|post|put|delete|patch|options|head)\s*\(\s*['"]([^'"`]+)['"]\s*\)/g,
      // Alternative pattern for multi-line decorators
      /@(\w+\.)?(?:app|api|router)\.(get|post|put|delete|patch|options|head)\s*\(\s*['"]([^'"`]+)['"]\s*\)/g,
    ];

    const lines = content.split('\n');
    const decorators = new Map<number, FastAPIDecorator>();
    let currentFunctionName: string | null = null;
    let inDocstring = false;
    let docstringLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check for function definition after decorator
      const funcMatch = trimmed.match(/def\s+(\w+)\s*\(/);
      if (funcMatch) {
        currentFunctionName = funcMatch[1];
        // Associate function with the last decorator found
        const lastDecoratorLine = Array.from(decorators.keys()).filter(k => k < i).pop();
        if (lastDecoratorLine !== undefined) {
          decorators.get(lastDecoratorLine)!.function = currentFunctionName;
        }
      }

      // Check for docstring
      if (trimmed === '"""' || trimmed === "'''") {
        if (!inDocstring) {
          inDocstring = true;
          docstringLines = [];
        } else {
          inDocstring = false;
          // Parse complete docstring
          const docstring = docstringLines.join('\n');
          const lastDecoratorLine = Array.from(decorators.keys()).filter(k => k < i).pop();
          if (lastDecoratorLine !== undefined) {
            const decorator = decorators.get(lastDecoratorLine)!;
            decorator.summary = docstring.split('\n')[0].trim();
            decorator.description = docstring.trim();
          }
        }
      } else if (inDocstring) {
        docstringLines.push(trimmed);
      }

      // Check for decorators
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(trimmed);
        if (match) {
          const httpMethod = this.getHttpMethod(match[2]);
          const path = match[3];

          if (httpMethod && path) {
            decorators.set(i, {
              name: httpMethod,
              path: path,
              line: i + 1,
            });
          }
        }
      }
    }

    // Convert decorators to endpoints
    for (const [lineIndex, decorator] of decorators) {
      const hasBody = this.lookForRequestBody(lines, lineIndex);

      endpoints.push({
        id: `${decorator.name}:${decorator.path}`,
        method: decorator.name as HttpMethod,
        path: `/${decorator.path.replace(/^\//, '')}`,
        summary: decorator.summary || `${decorator.name} ${decorator.path}`,
        description: decorator.description,
        tags: this.extractTags(content, lineIndex, lines),
        parameters: this.extractPathParams(decorator.path),
        requestBody: hasBody ? { type: 'object', description: 'Request body' } : undefined,
        responses: this.extractResponsesFromDocstring(decorator.description || ''),
        authentication: { type: 'none' },
        deprecated: false,
        sourceFile: filePath,
        sourceLine: decorator.line || 1,
        metadata: {
          framework: 'fastapi',
          functionName: decorator.function,
        },
      });
    }

    return endpoints;
  }

  /**
   * Extract path parameters from route path
   */
  private extractPathParams(path: string): Parameter[] {
    const params: Parameter[] = [];
    // Python FastAPI uses {param} syntax
    const paramPattern = /\{(\w+)(?::[^}]+)?\}/g;
    let match;

    while ((match = paramPattern.exec(path)) !== null) {
      const name = match[1];
      params.push({
        name,
        type: 'string',
        location: 'path',
        required: true,
        description: `Path parameter "${name}"`,
      });
    }

    return params;
  }

  /**
   * Extract tags from comments near the decorator
   */
  private extractTags(content: string, lineIndex: number, lines: string[]): string[] {
    const tags: string[] = [];

    for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 10); i--) {
      const line = lines[i].trim();
      if (line.startsWith('#') && (line.includes('@tag') || line.includes('tag:'))) {
        const tagMatch = line.match(/(?:@tag|tag:)\s*(\w+)/);
        if (tagMatch) {
          tags.push(tagMatch[1]);
        }
      }
      if (line.startsWith('def ') || line.startsWith('@')) {
        break;
      }
    }

    if (tags.length === 0) {
      tags.push('API');
    }

    return tags;
  }

  /**
   * Look ahead to check if function has request body
   */
  private lookForRequestBody(lines: string[], startIndex: number): boolean {
    // Look for body parameters in function signature
    for (let i = startIndex; i < Math.min(lines.length, startIndex + 5); i++) {
      const line = lines[i];
      if (line.includes('body: ') || line.includes('request: ')) {
        return true;
      }
      if (line.trim().startsWith('def ')) {
        const funcSig = lines[i].match(/def\s+\w+\(([^)]*)\)/);
        if (funcSig && funcSig[1].includes('body: ')) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Extract responses from docstring
   */
  private extractResponsesFromDocstring(docstring?: string): Response[] {
    const responses: Response[] = [];

    if (docstring) {
      // Look for @return annotations or common patterns
      if (docstring.toLowerCase().includes('returns') || docstring.toLowerCase().includes(':return:')) {
        responses.push({ statusCode: 200, description: 'Success' });
      } else {
        responses.push({ statusCode: 200, description: 'Success' });
      }
    }

    if (responses.length === 0) {
      responses.push({ statusCode: 200, description: 'Success' });
    }

    return responses;
  }

  /**
   * Convert HTTP method to HttpMethod type
   */
  private getHttpMethod(method: string): HttpMethod {
    const upper = method.toUpperCase();
    const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE'];
    if (validMethods.includes(upper as HttpMethod)) {
      return upper as HttpMethod;
    }
    return 'GET'; // Default to GET
  }

  /**
   * Find all Python files in a directory
   */
  private findPythonFiles(dirPath: string): string[] {
    const pyFiles: string[] = [];

    if (!existsSync(dirPath)) {
      return pyFiles;
    }

    const scanDir = (currentPath: string) => {
      const entries = readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== '__pycache__') {
          scanDir(fullPath);
        } else if (entry.isFile() && extname(entry.name) === '.py') {
          pyFiles.push(fullPath);
        }
      }
    };

    scanDir(dirPath);
    return pyFiles;
  }
}

/**
 * Factory function
 */
export function createPythonParser(options: PythonParserOptions): PythonFastAPIParser {
  return new PythonFastAPIParser(options);
}
