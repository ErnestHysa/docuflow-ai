/**
 * TypeScript AST Parser placeholder
 * This module will be enhanced with full tree-sitter integration
 */

import type { ApiEndpoint } from '../types/index.js';

export class TypeScriptParser {
  async parseFile(filePath: string): Promise<ApiEndpoint[]> {
    // Placeholder - will be implemented with tree-sitter or ts compiler API
    return [];
  }
}
