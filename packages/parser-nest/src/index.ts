/**
 * NestJS Route Parser - Extracts API definitions from NestJS code
 */

import * as ts from 'typescript';
import type { ApiEndpoint, HttpMethod, ParserConfig } from '@docuflow/core';

export interface NestParserOptions {
  cwd: string;
  config: ParserConfig;
}

/**
 * Mapping of NestJS decorators to HTTP methods
 */
const DECORATOR_METHODS: Record<string, HttpMethod> = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Delete: 'DELETE',
  Patch: 'PATCH',
  Options: 'OPTIONS',
  Head: 'HEAD',
  All: 'GET',
};

/**
 * Main NestJS parser class
 */
export class NestRouteParser {
  private options: NestParserOptions;
  private program: ts.Program;

  constructor(options: NestParserOptions) {
    this.options = options;
    this.program = this.createProgram();
  }

  /**
   * Parse a single file for NestJS routes
   */
  parseFile(filePath: string): ApiEndpoint[] {
    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      return [];
    }

    const endpoints: ApiEndpoint[] = [];
    const classInfo = this.extractClassInfo(sourceFile);

    const visit = (node: ts.Node) => {
      // Look for controller methods with decorators
      if (ts.isMethodDeclaration(node)) {
        const endpoint = this.tryParseControllerMethod(node, classInfo, filePath);
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
   * Try to parse a controller method as an endpoint
   */
  private tryParseControllerMethod(
    node: ts.MethodDeclaration,
    classInfo: ClassInfo,
    filePath: string
  ): ApiEndpoint | null {
    const decorators = this.getDecorators(node);
    const httpDecorator = decorators.find((d) =>
      Object.keys(DECORATOR_METHODS).includes(d.name)
    );

    if (!httpDecorator) {
      return null;
    }

    const method = DECORATOR_METHODS[httpDecorator.name];
    const path = this.combinePaths(classInfo.path, this.getDecoratorPath(httpDecorator));
    const sourceLine = this.getSourceLine(node);

    return {
      id: `${method}:${path}`,
      method,
      path,
      summary: this.extractSummary(node),
      description: this.extractDescription(node),
      tags: [classInfo.name || 'Controllers'],
      parameters: this.extractParameters(node, path),
      requestBody: this.extractRequestBody(node),
      responses: this.extractResponses(node),
      authentication: this.extractAuth(node, classInfo),
      deprecated: this.isDeprecated(node),
      sourceFile: filePath,
      sourceLine,
      metadata: {},
    };
  }

  /**
   * Extract class-level information (controller path, name, guards)
   */
  private extractClassInfo(sourceFile: ts.SourceFile): ClassInfo {
    let info: ClassInfo = { name: '', path: '', guards: [] };

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node)) {
        const decorators = this.getDecorators(node);
        const controllerDecorator = decorators.find((d) => d.name === 'Controller');

        if (controllerDecorator) {
          info = {
            name: node.name?.getText() || '',
            path: this.getDecoratorPath(controllerDecorator),
            guards: decorators
              .filter((d) => d.name === 'UseGuards' || d.name === 'Guard')
              .map((d) => d.name),
          };
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return info;
  }

  /**
   * Get all decorators for a node
   */
  private getDecorators(node: ts.HasDecorators): DecoratorInfo[] {
    const decorators: DecoratorInfo[] = [];

    const processDecorator = (decorator: ts.Decorator) => {
      if (ts.isCallExpression(decorator.expression)) {
        if (ts.isIdentifier(decorator.expression.expression)) {
          decorators.push({
            name: decorator.expression.expression.text,
            args: decorator.expression.arguments.map((a) => a.getText()),
          });
        }
      }
    };

    (node as any).decorators?.forEach(processDecorator);
    return decorators;
  }

  /**
   * Get path from decorator arguments
   */
  private getDecoratorPath(decorator: DecoratorInfo): string {
    if (decorator.args.length > 0) {
      const firstArg = decorator.args[0];
      // Remove quotes from string literal
      return firstArg.replace(/^['"]|['"]$/g, '') || '';
    }
    return '';
  }

  /**
   * Combine class and method paths
   */
  private combinePaths(classPath: string, methodPath: string): string {
    const combined = `${classPath}/${methodPath}`;
    return combined.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
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
   * Extract parameters from decorators and JSDoc
   */
  private extractParameters(node: ts.MethodDeclaration, path: string): ApiEndpoint['parameters'] {
    const params: ApiEndpoint['parameters'] = [];

    // Extract path parameters
    const pathParamRegex = /:([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    while ((match = pathParamRegex.exec(path)) !== null) {
      const paramName = match[1];
      params.push({
        name: paramName,
        type: 'string',
        location: 'path',
        required: true,
        description: this.getParamDescription(node, paramName),
      });
    }

    // Check @Param decorators
    for (const param of node.parameters) {
      const decorators = this.getDecorators(param);
      const paramDecorator = decorators.find((d) => d.name === 'Param');

      if (paramDecorator && paramDecorator.args.length > 0) {
        const paramName = paramDecorator.args[0].replace(/['"]/g, '');
        if (!params.find((p) => p.name === paramName)) {
          params.push({
            name: paramName,
            type: this.getTypeFromParam(param),
            location: 'path',
            required: true,
            description: this.getParamDescription(node, paramName),
          });
        }
      }

      const queryDecorator = decorators.find((d) => d.name === 'Query');
      if (queryDecorator) {
        const paramName = queryDecorator.args[0]?.replace(/['"]/g, '') || param.name?.getText() || '';
        params.push({
          name: paramName,
          type: this.getTypeFromParam(param),
          location: 'query',
          required: param.questionToken === undefined,
          description: this.getParamDescription(node, paramName),
        });
      }

      const bodyDecorator = decorators.find((d) => d.name === 'Body');
      if (bodyDecorator) {
        const paramName = bodyDecorator.args[0]?.replace(/['"]/g, '') || 'body';
        // Body parameter handled separately in requestBody
      }
    }

    return params;
  }

  /**
   * Get type from parameter
   */
  private getTypeFromParam(param: ts.ParameterDeclaration): string {
    if (param.type) {
      const typeText = param.type.getText();
      return typeText || 'any';
    }
    return 'any';
  }

  /**
   * Get parameter description from JSDoc
   */
  private getParamDescription(node: ts.MethodDeclaration, paramName: string): string | undefined {
    const jsDoc = this.getJSDoc(node);
    const paramTag = jsDoc?.tags?.find((t: any) => t.tagName.text === 'param' && t.comment?.toString().includes(paramName));
    return paramTag?.comment?.toString().split(' ').slice(1).join(' ') || undefined;
  }

  /**
   * Extract request body from @Body decorator and JSDoc
   */
  private extractRequestBody(node: ts.MethodDeclaration): ApiEndpoint['requestBody'] | undefined {
    for (const param of node.parameters) {
      const decorators = this.getDecorators(param);
      if (decorators.find((d) => d.name === 'Body')) {
        return {
          type: this.getTypeFromParam(param),
          description: this.extractParamDescription(node, param.name?.getText() || 'body'),
        };
      }
    }
    return undefined;
  }

  /**
   * Extract description for a specific parameter
   */
  private extractParamDescription(node: ts.MethodDeclaration, paramName: string): string | undefined {
    const jsDoc = this.getJSDoc(node);
    const paramTag = jsDoc?.tags?.find((t: any) => t.tagName.text === 'param');
    if (paramTag?.comment) {
      const comment = paramTag.comment.toString();
      if (comment.includes(paramName)) {
        return comment.split(' ').slice(1).join(' ') || undefined;
      }
    }
    return undefined;
  }

  /**
   * Extract response definitions from JSDoc
   */
  private extractResponses(node: ts.MethodDeclaration): ApiEndpoint['responses'] {
    const responses: ApiEndpoint['responses'] = [];
    const jsDoc = this.getJSDoc(node);

    responses.push({ statusCode: 200, description: 'Successful response' });

    jsDoc?.tags?.filter((tag: any) => tag.tagName.text === 'returns' || tag.tagName.text === 'return')
      .forEach((tag: any) => {
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
   * Extract authentication info from guards
   */
  private extractAuth(node: ts.MethodDeclaration, classInfo: ClassInfo): ApiEndpoint['authentication'] {
    const decorators = this.getDecorators(node);
    const guards = [
      ...decorators.filter((d) => d.name === 'UseGuards' || d.name === 'Guard').map((d) => d.name),
      ...classInfo.guards,
    ];

    if (guards.length > 0) {
      // Check for common auth guards
      const guardText = guards.join(' ').toLowerCase();
      if (guardText.includes('jwt') || guardText.includes('auth')) {
        return { type: 'bearer', bearerFormat: 'JWT' };
      }
      if (guardText.includes('api')) {
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
    return !!jsDoc?.tags?.some((t: any) => t.tagName.text === 'deprecated');
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
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    };

    return ts.createProgram([], compilerOptions);
  }
}

interface ClassInfo {
  name: string;
  path: string;
  guards: string[];
}

interface DecoratorInfo {
  name: string;
  args: string[];
}

/**
 * Public factory function
 */
export function createNestParser(options: NestParserOptions): NestRouteParser {
  return new NestRouteParser(options);
}
