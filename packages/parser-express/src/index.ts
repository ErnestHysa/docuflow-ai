/**
 * Express Route Parser - Extracts API definitions from Express.js code
 */

import * as ts from 'typescript';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { ApiEndpoint, HttpMethod, ParserConfig } from '@docuflow/core';

export interface ExpressParserOptions {
  cwd: string;
  config: ParserConfig;
}

/**
 * Pattern for matching Express route methods
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
  all: 'GET', // 'all' matches all methods, defaulting to GET for documentation
};

/**
 * Main Express parser class
 */
export class ExpressRouteParser {
  private options: ExpressParserOptions;

  constructor(options: ExpressParserOptions) {
    this.options = options;
  }

  /**
   * Parse a single file for Express routes
   */
  parseFile(filePath: string): ApiEndpoint[] {
    // Create a new program with this file included
    const program = ts.createProgram([filePath], this.getCompilerOptions());
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
      return [];
    }

    const endpoints: ApiEndpoint[] = [];

    const visit = (node: ts.Node) => {
      // Check for app.METHOD() or router.METHOD() patterns
      if (ts.isCallExpression(node)) {
        const endpoint = this.tryParseRouteCall(node, filePath);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }

      // Check for Router() / express.Router() patterns
      if (ts.isVariableDeclaration(node)) {
        this.trackRouterVariables(node);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return endpoints;
  }

  /**
   * Get compiler options
   */
  private getCompilerOptions(): ts.CompilerOptions {
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
      esModuleInterop: true,
    };

    if (configPath) {
      const config = ts.readConfigFile(configPath, ts.sys.readFile);
      const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, this.options.cwd);
      compilerOptions.allowJs = true;
      compilerOptions.checkJs = true;
    }

    return compilerOptions;
  }

  /**
   * Attempt to parse a route call expression
   */
  private tryParseRouteCall(node: ts.CallExpression, filePath: string): ApiEndpoint | null {
    const method = this.getHttpMethod(node);
    if (!method) {
      return null;
    }

    const path = this.getPathArgument(node);
    const sourceLine = sourceFileGetLine(node, filePath);

    return {
      id: `${method}:${path}`,
      method,
      path,
      summary: this.extractSummary(node),
      description: this.extractDescription(node),
      tags: this.extractTags(node),
      parameters: this.extractParameters(node),
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
   * Get HTTP method from call expression
   */
  private getHttpMethod(node: ts.CallExpression): HttpMethod | null {
    if (!ts.isPropertyAccessExpression(node.expression)) {
      return null;
    }

    const methodName = node.expression.name.text;
    if (ROUTE_METHODS.includes(methodName as any)) {
      return HTTP_METHODS[methodName];
    }

    return null;
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

    // String literal
    if (ts.isStringLiteral(firstArg)) {
      return firstArg.text;
    }

    // Template literal
    if (ts.isNoSubstitutionTemplateLiteral(firstArg)) {
      return firstArg.text;
    }

    // Try to evaluate simple expressions
    if (ts.isTemplateExpression(firstArg)) {
      return firstArg.head.text;
    }

    return '/';
  }

  /**
   * Extract summary from JSDoc
   */
  private extractSummary(node: ts.Node): string | undefined {
    const jsDoc = this.getJSDoc(node);
    return jsDoc?.tags?.find((t) => t.tagName.text === 'summary')?.comment?.toString() ||
           jsDoc?.comment?.toString().split('\n')[0];
  }

  /**
   * Extract description from JSDoc
   */
  private extractDescription(node: ts.Node): string | undefined {
    const jsDoc = this.getJSDoc(node);
    const summary = this.extractSummary(node);
    if (summary && jsDoc?.comment) {
      const fullComment = jsDoc.comment.toString();
      return fullComment.substring(summary.length).trim() || undefined;
    }
    return undefined;
  }

  /**
   * Extract tags from JSDoc
   */
  private extractTags(node: ts.Node): string[] {
    const jsDoc = this.getJSDoc(node);
    const tagComment = jsDoc?.tags?.find((t) => t.tagName.text === 'tag')?.comment;
    if (tagComment) {
      return tagComment.toString().split(',').map((t) => t.trim());
    }
    const apiTag = jsDoc?.tags?.find((t) => t.tagName.text === 'api');
    if (apiTag?.comment) {
      return [apiTag.comment.toString()];
    }
    return ['General'];
  }

  /**
   * Extract parameters from JSDoc and route path
   */
  private extractParameters(node: ts.CallExpression): ApiEndpoint['parameters'] {
    const params: ApiEndpoint['parameters'] = [];
    const path = this.getPathArgument(node);

    // Extract path parameters (e.g., :id, :userId)
    const pathParamRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = pathParamRegex.exec(path)) !== null) {
      const paramName = match[1];
      const param = this.extractParamFromJSDoc(node, paramName);
      params.push({
        name: paramName,
        type: param?.type || 'string',
        location: 'path',
        required: true,
        description: param?.description,
      });
    }

    // Extract query parameters from JSDoc @param
    const jsDoc = this.getJSDoc(node);
    jsDoc?.tags?.filter((tag) => tag.tagName.text === 'param')
      .forEach((tag) => {
        const comment = tag.comment?.toString() || '';
        const parts = comment.match(/(\w+)(?:\s*{(\w+)})?\s*(.*)/);
        if (parts) {
          const [, name, type, description] = parts;
          // Skip if already added as path param
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
   * Extract specific parameter info from JSDoc
   */
  private extractParamFromJSDoc(node: ts.Node, paramName: string): { type?: string; description?: string } | undefined {
    const jsDoc = this.getJSDoc(node);
    const paramTag = jsDoc?.tags?.find((t) => t.tagName.text === 'param');
    if (!paramTag?.comment) {
      return undefined;
    }

    const comment = paramTag.comment.toString();
    const parts = comment.match(/(\w+)(?:\s*{(\w+)})?\s*(.*)/);
    if (parts && parts[1] === paramName) {
      return {
        type: parts[2],
        description: parts[3] || undefined,
      };
    }

    return undefined;
  }

  /**
   * Extract request body from JSDoc @body or @requestbody
   */
  private extractRequestBody(node: ts.CallExpression): ApiEndpoint['requestBody'] | undefined {
    const jsDoc = this.getJSDoc(node);
    const bodyTag = jsDoc?.tags?.find((t) => t.tagName.text === 'body' || t.tagName.text === 'requestbody');
    if (!bodyTag?.comment) {
      return undefined;
    }

    // Try to parse JSON example from comment
    const comment = bodyTag.comment.toString();
    try {
      const jsonMatch = comment.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return {
          type: 'object',
          example: JSON.parse(jsonMatch[1]),
        };
      }
    } catch {
      // Fall through to type extraction
    }

    return {
      type: 'object',
      description: comment,
    };
  }

  /**
   * Extract response definitions from JSDoc @returns
   */
  private extractResponses(node: ts.CallExpression): ApiEndpoint['responses'] {
    const responses: ApiEndpoint['responses'] = [];
    const jsDoc = this.getJSDoc(node);

    // Default 200 response
    responses.push({
      statusCode: 200,
      description: 'Successful response',
    });

    // Extract from @returns tags
    jsDoc?.tags?.filter((tag) => tag.tagName.text === 'returns' || tag.tagName.text === 'return')
      .forEach((tag) => {
        const comment = tag.comment?.toString() || '';
        const statusMatch = comment.match(/(\d{3})\s+-\s+(.*)/);
        if (statusMatch) {
          const [, status, description] = statusMatch;
          responses.push({ statusCode: parseInt(status), description });
        } else {
          responses[0].description = comment;
        }
      });

    // Add common error responses from JSDoc
    const errorCodes = jsDoc?.tags
      ?.filter((tag) => tag.tagName.text === 'error' || tag.tagName.text === 'throws')
      .map((tag) => {
        const comment = tag.comment?.toString() || '';
        const match = comment.match(/(\d{3})\s+(.*)/);
        return match ? { statusCode: parseInt(match[1]), description: match[2] } : null;
      })
      .filter(Boolean) as Array<{ statusCode: number; description: string }> || [];

    responses.push(...errorCodes);

    // Default 404 and 500 for API routes
    if (!responses.find((r) => r.statusCode === 404)) {
      responses.push({ statusCode: 404, description: 'Not found' });
    }
    if (!responses.find((r) => r.statusCode === 500)) {
      responses.push({ statusCode: 500, description: 'Internal server error' });
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
        return { type: 'bearer', bearerFormat: 'JWT', description: authTag.comment.toString() };
      }
      if (authType.includes('apikey') || authType.includes('api-key')) {
        return { type: 'apiKey', description: authTag.comment.toString() };
      }
      if (authType.includes('basic')) {
        return { type: 'basic', description: authTag.comment.toString() };
      }
      if (authType.includes('oauth')) {
        return { type: 'oauth2', description: authTag.comment.toString() };
      }
    }

    // Check for common auth middleware patterns
    if (this.hasAuthMiddleware(node)) {
      return { type: 'bearer', bearerFormat: 'JWT' };
    }

    return { type: 'none' };
  }

  /**
   * Check if route has auth middleware
   */
  private hasAuthMiddleware(node: ts.CallExpression): boolean {
    // This is a simplified check - in production, you'd analyze the middleware chain
    return false;
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
    const jsDocTags = (node as any).jsDoc;
    return jsDocTags;
  }

  /**
   * Track router variables for cross-file analysis
   */
  private trackRouterVariables(node: ts.VariableDeclaration): void {
    // Implementation for tracking router exports
    // This enables parsing routes from modules that export routers
  }
}

/**
 * Helper: Get line number for a node
 */
function sourceFileGetLine(node: ts.Node, filePath: string): number {
  const sourceFile = node.getSourceFile();
  if (sourceFile) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return line + 1;
  }
  return 0;
}

/**
 * Public factory function
 */
export function createExpressParser(options: ExpressParserOptions): ExpressRouteParser {
  return new ExpressRouteParser(options);
}
