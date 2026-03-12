/**
 * Fastify Route Parser - Extracts API definitions from Fastify code
 */

import * as ts from 'typescript';
import { readFileSync } from 'fs';
import type { ApiEndpoint, HttpMethod, ParserConfig } from '@docuflow/core';

export interface FastifyParserOptions {
  cwd: string;
  config: ParserConfig;
}

/**
 * Pattern for matching Fastify route methods
 */
const ROUTE_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options', 'all'] as const;
const HTTP_METHODS: Record<string, HttpMethod> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  delete: 'DELETE',
  patch: 'PATCH',
  head: 'HEAD',
  options: 'OPTIONS',
  all: 'GET',
};

/**
 * Main Fastify parser class
 */
export class FastifyRouteParser {
  private options: FastifyParserOptions;
  private program: ts.Program;

  constructor(options: FastifyParserOptions) {
    this.options = options;
    this.program = this.createProgram();
  }

  /**
   * Parse a single file for Fastify routes
   */
  parseFile(filePath: string): ApiEndpoint[] {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      return [];
    }

    const endpoints: ApiEndpoint[] = [];

    const visit = (node: ts.Node) => {
      // Check for fastify.route() pattern
      if (ts.isCallExpression(node)) {
        const endpoint = this.tryParseRouteCall(node, filePath);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }

      // Check for fastify.METHOD() shorthand
      if (ts.isCallExpression(node)) {
        const endpoint = this.tryParseShorthandCall(node, filePath);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return endpoints;
  }

  /**
   * Try to parse fastify.route({ method, url }) call
   */
  private tryParseRouteCall(node: ts.CallExpression, filePath: string): ApiEndpoint | null {
    // Check if calling .route() method
    if (!ts.isPropertyAccessExpression(node.expression)) {
      return null;
    }

    if (node.expression.name.text !== 'route') {
      return null;
    }

    // Get the config object from first argument
    if (node.arguments.length === 0) {
      return null;
    }

    const configArg = node.arguments[0];
    if (!ts.isObjectLiteralExpression(configArg)) {
      return null;
    }

    let method: HttpMethod | null = null;
    let path = '/';

    // Extract method and url from object literal
    for (const prop of configArg.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;

      const name = prop.name.getText();
      if (name === 'method') {
        if (ts.isStringLiteral(prop.initializer)) {
          method = (prop.initializer.text.toUpperCase() as HttpMethod);
        }
      } else if (name === 'url' || name === 'path') {
        if (ts.isStringLiteral(prop.initializer)) {
          path = prop.initializer.text;
        }
      }
    }

    if (!method || !path) {
      return null;
    }

    const sourceLine = this.getSourceLine(node);

    return {
      id: `${method}:${path}`,
      method,
      path,
      summary: this.extractSummary(node),
      description: this.extractDescription(node),
      tags: this.extractTags(node, configArg),
      parameters: this.extractParameters(node, path),
      requestBody: this.extractRequestBody(node),
      responses: this.extractResponses(node),
      authentication: this.extractAuth(node),
      deprecated: this.isDeprecated(node),
      sourceFile: filePath,
      sourceLine,
      metadata: {},
    };
  }

  /**
   * Try to parse fastify.get(url, handler) shorthand
   */
  private tryParseShorthandCall(node: ts.CallExpression, filePath: string): ApiEndpoint | null {
    if (!ts.isPropertyAccessExpression(node.expression)) {
      return null;
    }

    const methodName = node.expression.name.text;
    if (!ROUTE_METHODS.includes(methodName as any)) {
      return null;
    }

    const method = HTTP_METHODS[methodName];
    const path = this.getPathArgument(node);
    const sourceLine = this.getSourceLine(node);

    return {
      id: `${method}:${path}`,
      method,
      path,
      summary: this.extractSummary(node),
      description: this.extractDescription(node),
      tags: this.extractTags(node),
      parameters: this.extractParameters(node, path),
      requestBody: this.extractRequestBody(node),
      responses: this.extractResponses(node),
      authentication: this.extractAuth(node),
      deprecated: this.isDeprecated(node),
      sourceFile: filePath,
      sourceLine,
      metadata: {},
    };
  }

  /**
   * Get path argument from route call
   */
  private getPathArgument(node: ts.CallExpression): string {
    const args = node.arguments;
    if (args.length === 0) {
      return '/';
    }

    const firstArg = args[0];
    if (ts.isStringLiteral(firstArg)) {
      return firstArg.text;
    }

    if (ts.isNoSubstitutionTemplateLiteral(firstArg)) {
      return firstArg.text;
    }

    return '/';
  }

  /**
   * Extract summary from JSDoc
   */
  private extractSummary(node: ts.Node): string | undefined {
    const jsDoc = this.getJSDoc(node);
    return jsDoc?.comment?.toString().split('\n')[0];
  }

  /**
   * Extract description from JSDoc
   */
  private extractDescription(node: ts.Node): string | undefined {
    const jsDoc = this.getJSDoc(node);
    if (!jsDoc?.comment) return undefined;
    const lines = jsDoc.comment.toString().split('\n');
    return lines.length > 1 ? lines.slice(1).join('\n').trim() : undefined;
  }

  /**
   * Extract tags from JSDoc or route schema
   */
  private extractTags(node: ts.Node, configArg?: ts.ObjectLiteralExpression): string[] {
    const jsDoc = this.getJSDoc(node);
    const tagComment = jsDoc?.tags?.find((t) => t.tagName.text === 'tag')?.comment;
    if (tagComment) {
      return tagComment.toString().split(',').map((t) => t.trim());
    }

    // Try to extract from schema
    if (configArg) {
      for (const prop of configArg.properties) {
        if (ts.isPropertyAssignment(prop) && prop.name.getText() === 'schema') {
          // Would need to parse schema to extract tags
          break;
        }
      }
    }

    return ['General'];
  }

  /**
   * Extract parameters from path and schema
   */
  private extractParameters(node: ts.CallExpression, path: string): ApiEndpoint['parameters'] {
    const params: ApiEndpoint['parameters'] = [];

    // Extract path parameters (e.g., :id)
    const pathParamRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = pathParamRegex.exec(path)) !== null) {
      const paramName = match[1];
      params.push({
        name: paramName,
        type: 'string',
        location: 'path',
        required: true,
        description: undefined,
      });
    }

    // Extract query parameters from JSDoc
    const jsDoc = this.getJSDoc(node);
    jsDoc?.tags?.filter((tag) => tag.tagName.text === 'param')
      .forEach((tag) => {
        const comment = tag.comment?.toString() || '';
        const parts = comment.match(/(\w+)(?:\s*{(\w+)})?\s*(.*)/);
        if (parts) {
          const [, name, type, description] = parts;
          if (!params.find((p) => p.name === name)) {
            params.push({
              name,
              type: type || 'string',
              location: path.includes(`:${name}`) ? 'path' : 'query',
              required: !comment.includes('['),
              description: description || undefined,
            });
          }
        }
      });

    return params;
  }

  /**
   * Extract request body from JSDoc or schema
   */
  private extractRequestBody(node: ts.CallExpression): ApiEndpoint['requestBody'] | undefined {
    const jsDoc = this.getJSDoc(node);
    const bodyTag = jsDoc?.tags?.find((t) => t.tagName.text === 'body' || t.tagName.text === 'requestbody');
    if (!bodyTag?.comment) return undefined;

    const comment = bodyTag.comment.toString();
    try {
      const jsonMatch = comment.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return { type: 'object', example: JSON.parse(jsonMatch[1]) };
      }
    } catch {}

    return { type: 'object', description: comment };
  }

  /**
   * Extract response definitions
   */
  private extractResponses(node: ts.CallExpression): ApiEndpoint['responses'] {
    const responses: ApiEndpoint['responses'] = [];
    const jsDoc = this.getJSDoc(node);

    responses.push({ statusCode: 200, description: 'Successful response' });

    jsDoc?.tags?.filter((tag) => tag.tagName.text === 'returns' || tag.tagName.text === 'return')
      .forEach((tag) => {
        const comment = tag.comment?.toString() || '';
        const statusMatch = comment.match(/(\d{3})\s+-\s+(.*)/);
        if (statusMatch) {
          const [, status, description] = statusMatch;
          responses.push({ statusCode: parseInt(status), description });
        }
      });

    if (!responses.find((r) => r.statusCode === 404)) {
      responses.push({ statusCode: 404, description: 'Not found' });
    }

    return responses;
  }

  /**
   * Extract authentication info
   */
  private extractAuth(node: ts.CallExpression): ApiEndpoint['authentication'] {
    const jsDoc = this.getJSDoc(node);
    const authTag = jsDoc?.tags?.find((t) => t.tagName.text === 'auth' || t.tagName.text === 'authentication');

    if (authTag?.comment) {
      const authType = authTag.comment.toString().toLowerCase();
      if (authType.includes('bearer') || authType.includes('jwt')) {
        return { type: 'bearer', bearerFormat: 'JWT' };
      }
      if (authType.includes('apikey')) {
        return { type: 'apiKey' };
      }
    }

    return { type: 'none' };
  }

  /**
   * Check if endpoint is deprecated
   */
  private isDeprecated(node: ts.Node): boolean {
    const jsDoc = this.getJSDoc(node);
    return !!jsDoc?.tags?.some((t) => t.tagName.text === 'deprecated');
  }

  /**
   * Get JSDoc for a node
   */
  private getJSDoc(node: ts.Node): ts.JSDoc | undefined {
    return (node as any).jsDoc;
  }

  /**
   * Get source line number
   */
  private getSourceLine(node: ts.Node): number {
    const sourceFile = node.getSourceFile();
    if (sourceFile) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      return line + 1;
    }
    return 0;
  }

  /**
   * Create TypeScript program
   */
  private createProgram(): ts.Program {
    const configPath = ts.findConfigFile(
      this.options.cwd,
      ts.sys.fileExists,
      'tsconfig.json'
    );

    const compilerOptions: ts.CompilerOptions = {
      allowJs: true,
      checkJs: true,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      strict: false,
      skipLibCheck: true,
    };

    return ts.createProgram([], compilerOptions);
  }
}

/**
 * Public factory function
 */
export function createFastifyParser(options: FastifyParserOptions): FastifyRouteParser {
  return new FastifyRouteParser(options);
}
