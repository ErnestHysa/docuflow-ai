/**
 * DocuFlow Core - Main entry point
 */

import type {
  HttpMethod,
  ParamLocation,
  Parameter,
  Schema,
  SchemaProperty,
  Response,
  AuthType,
  Authentication,
  RateLimit,
  ApiEndpoint,
  ApiVersion,
  ApiDiff,
  ApiChange,
  DiffSummary,
  ParserConfig,
  ScanResult,
  ScanError,
  ExportFormat,
  ExportOptions,
  FrameworkDetection,
} from './types/index.js';

export type {
  HttpMethod,
  ParamLocation,
  Parameter,
  Schema,
  SchemaProperty,
  Response,
  AuthType,
  Authentication,
  RateLimit,
  ApiEndpoint,
  ApiVersion,
  ApiDiff,
  ApiChange,
  DiffSummary,
  ParserConfig,
  ScanResult,
  ScanError,
  ExportFormat,
  ExportOptions,
  FrameworkDetection,
};

export { ApiScanner } from './scanner.js';
export { DiffEngine } from './diff.js';
export { DocumentationExporter } from './exporter.js';

// Default configuration
export const DEFAULT_PARSER_CONFIG: ParserConfig = {
  includePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
  excludePatterns: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js', '**/node_modules/**'],
  framework: 'auto',
  extractJSDoc: true,
  extractValidation: true,
  ignorePatterns: ['**/dist/**', '**/build/**', '**/.next/**'],
};

export const DEFAULT_EXPORT_OPTIONS: Partial<ExportOptions> = {
  format: 'markdown',
  includeChanges: true,
  theme: 'auto',
};
