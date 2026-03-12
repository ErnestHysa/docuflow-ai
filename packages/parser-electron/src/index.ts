/**
 * Electron IPC Parser
 * Scans Electron main process code for IPC handlers and channels
 */

import * as ts from 'typescript';
import type { ApiEndpoint } from '@docuflow/core';

export interface ElectronParserOptions {
  cwd: string;
  config: {
    includePatterns?: string[];
    excludePatterns?: string[];
    [key: string]: any;
  };
}

export interface IpcChannel {
  id: string;
  channel: string;
  type: 'handle' | 'on' | 'send'; // handle=two-way, on=one-way receive, send=one-way send
  location: 'main' | 'renderer' | 'preload';
  summary?: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  returnType?: string;
  sourceFile: string;
  sourceLine: number;
  deprecated: boolean;
}

export class ElectronIPCParser {
  private options: ElectronParserOptions;
  private channels: Map<string, IpcChannel> = new Map();

  constructor(options: ElectronParserOptions) {
    this.options = options;
  }

  /**
   * Parse a single file for Electron IPC patterns
   */
  parseFile(filePath: string): ApiEndpoint[] {
    const program = ts.createProgram([filePath], this.getCompilerOptions());
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
      console.error('[ElectronParser] Could not load source file:', filePath);
      return [];
    }

    this.channels.clear();

    let callCount = 0;
    let ipcCallCount = 0;

    const visit = (node: ts.Node) => {
      // Look for ipcMain.handle() and ipcMain.on()
      if (ts.isCallExpression(node)) {
        callCount++;
        const method = this.getIpcMethod(node);
        if (method) {
          ipcCallCount++;
          this.tryParseIpcCall(node, sourceFile, filePath);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // Debug logging (can be removed later)
    if (process.env.DEBUG_ELECTRON_PARSER) {
      console.log(`[ElectronParser] Scanned ${filePath}: ${callCount} calls, ${ipcCallCount} IPC calls, ${this.channels.size} channels found`);
    }

    // Convert IPC channels to ApiEndpoint format
    return this.convertToEndpoints();
  }

  /**
   * Try to parse an IPC call expression
   */
  private tryParseIpcCall(node: ts.CallExpression, sourceFile: ts.SourceFile, filePath: string): void {
    try {
      // Get the method being called (handle, on, send, etc.)
      const method = this.getIpcMethod(node);
      if (!method) {
        return;
      }

      // Get the channel name (first argument)
      const channelName = this.getChannelName(node);
      if (!channelName) {
        return;
      }

      // Get JSDoc for documentation
      const jsDoc = this.getJSDoc(node);
      const summary = this.extractSummary(jsDoc);
      const description = this.extractDescription(jsDoc);

      // Get source line number
      const sourceLine = this.getSourceLine(node, sourceFile);

      // Check if deprecated
      let deprecated = false;
      try {
        deprecated = jsDoc?.tags?.some((t: any) => t.tagName?.text === 'deprecated') || false;
      } catch {
        deprecated = false;
      }

      // Create channel entry
      const channel: IpcChannel = {
        id: `${method}:${channelName}`,
        channel: channelName,
        type: method === 'handle' ? 'handle' : method === 'on' ? 'on' : 'send',
        location: 'main',
        summary,
        description,
        sourceFile: filePath,
        sourceLine,
        deprecated,
      };

      this.channels.set(channel.id, channel);
    } catch (error) {
      // Silently skip problematic nodes
    }
  }

  /**
   * Get the IPC method name from a call expression
   */
  private getIpcMethod(node: ts.CallExpression): 'handle' | 'on' | 'send' | null {
    if (!ts.isPropertyAccessExpression(node.expression)) {
      return null;
    }

    let methodName: string;
    try {
      methodName = node.expression.name.text;
    } catch {
      return null;
    }

    // Check if it's ipcMain.handle, ipcMain.on, or webContents.send
    // Need to check the actual expression structure
    const expr = node.expression.expression;

    // Check if expr is an identifier with name 'ipcMain'
    if (ts.isIdentifier(expr) && expr.text === 'ipcMain') {
      if (methodName === 'handle' || methodName === 'on') {
        return methodName;
      }
    }

    // Check for webContents.send
    if (ts.isIdentifier(expr) && expr.text === 'webContents') {
      if (methodName === 'send') {
        return 'send';
      }
    }

    // Check for event.reply or event.sender
    if (ts.isIdentifier(expr) && expr.text === 'event') {
      if (methodName === 'reply' || methodName === 'sender') {
        return 'send';
      }
    }

    return null;
  }

  /**
   * Get the channel name from an IPC call
   */
  private getChannelName(node: ts.CallExpression): string | null {
    if (node.arguments.length === 0) {
      return null;
    }

    const firstArg = node.arguments[0];

    // String literal channel name
    if (ts.isStringLiteral(firstArg)) {
      return firstArg.text;
    }

    // Template literal
    if (ts.isNoSubstitutionTemplateLiteral(firstArg)) {
      return firstArg.text;
    }

    return null;
  }

  /**
   * Get JSDoc for a node
   */
  private getJSDoc(node: ts.Node): ts.JSDoc | undefined {
    const jsDocTags = (node as any).jsDoc;
    return jsDocTags;
  }

  /**
   * Extract summary from JSDoc
   */
  private extractSummary(jsDoc: ts.JSDoc | undefined): string | undefined {
    if (!jsDoc) {
      return undefined;
    }
    try {
      const summaryTag = jsDoc.tags?.find((t: any) => t.tagName?.text === 'summary');
      if (summaryTag?.comment) {
        return summaryTag.comment.toString();
      }
      return jsDoc.comment?.toString().split('\n')[0];
    } catch {
      return undefined;
    }
  }

  /**
   * Extract description from JSDoc
   */
  private extractDescription(jsDoc: ts.JSDoc | undefined): string | undefined {
    if (!jsDoc) {
      return undefined;
    }
    try {
      const lines = jsDoc.comment?.toString().split('\n') || [];
      return lines.length > 1 ? lines.slice(1).join('\n').trim() : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Get source line number
   */
  private getSourceLine(node: ts.Node, sourceFile: ts.SourceFile): number {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return line + 1;
  }

  /**
   * Get compiler options
   */
  private getCompilerOptions(): ts.CompilerOptions {
    return {
      allowJs: true,
      checkJs: true,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      strict: false,
      skipLibCheck: true,
      esModuleInterop: true,
    };
  }

  /**
   * Convert IPC channels to ApiEndpoint format
   */
  private convertToEndpoints(): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];

    for (const channel of this.channels.values()) {
      endpoints.push({
        id: channel.id,
        method: channel.type === 'handle' ? 'POST' : 'GET',
        path: `ipc://${channel.channel}`,
        summary: channel.summary || `${channel.type} ${channel.channel}`,
        description: channel.description,
        tags: ['Electron', 'IPC', channel.type],
        parameters: [],
        requestBody: channel.type === 'handle' ? {
          type: 'object',
          description: 'IPC request payload',
        } : undefined,
        responses: channel.type === 'handle' ? [{
          statusCode: 200,
          description: 'IPC response',
        }] : [],
        authentication: { type: 'none' },
        deprecated: channel.deprecated,
        sourceFile: channel.sourceFile,
        sourceLine: channel.sourceLine,
        metadata: {
          channel: channel.channel,
          ipcType: channel.type,
          location: channel.location,
        },
      });
    }

    return endpoints;
  }
}

/**
 * Factory function
 */
export function createElectronParser(options: ElectronParserOptions): ElectronIPCParser {
  return new ElectronIPCParser(options);
}
