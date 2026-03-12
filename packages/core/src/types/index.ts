/**
 * Core types for DocuFlow AI
 * Represents API endpoints, schemas, and documentation metadata
 */

/**
 * Supported HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE';

/**
 * Parameter location
 */
export type ParamLocation = 'path' | 'query' | 'header' | 'cookie';

/**
 * Parameter type definition
 */
export interface Parameter {
  name: string;
  type: string;
  location: ParamLocation;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  enum?: unknown[];
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}

/**
 * Schema definition for request/response bodies
 */
export interface Schema {
  type: string;
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  items?: Schema;
  enum?: unknown[];
  description?: string;
  example?: unknown;
  $ref?: string;
  oneOf?: Schema[];
  anyOf?: Schema[];
  allOf?: Schema[];
  nullable?: boolean;
}

/**
 * Individual property in a schema
 */
export interface SchemaProperty {
  type: string;
  description?: string;
  required?: boolean;
  enum?: unknown[];
  example?: unknown;
  $ref?: string;
  items?: Schema;
  properties?: Record<string, SchemaProperty>;
}

/**
 * Response definition
 */
export interface Response {
  statusCode: number;
  description: string;
  schema?: Schema;
  example?: unknown;
  headers?: Record<string, string>;
}

/**
 * Authentication type
 */
export type AuthType = 'none' | 'bearer' | 'apiKey' | 'basic' | 'oauth2' | 'cookie';

/**
 * Authentication configuration
 */
export interface Authentication {
  type: AuthType;
  description?: string;
  bearerFormat?: 'JWT' | 'Token';
  apiKeyLocation?: 'header' | 'query';
  apiKeyName?: string;
  oauth2Scopes?: string[];
}

/**
 * Rate limit configuration
 */
export interface RateLimit {
  window: string; // e.g., "15m", "1h"
  maxRequests: number;
  description?: string;
}

/**
 * API endpoint definition
 */
export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters: Parameter[];
  requestBody?: Schema;
  responses: Response[];
  authentication: Authentication;
  rateLimit?: RateLimit;
  deprecated: boolean;
  sourceFile: string;
  sourceLine: number;
  metadata: Record<string, unknown>;
}

/**
 * API version information
 */
export interface ApiVersion {
  version: string;
  commitHash?: string;
  timestamp: string;
  endpoints: ApiEndpoint[];
}

/**
 * Change type for diff
 */
export type ChangeType = 'added' | 'removed' | 'modified' | 'breaking';

/**
 * Individual change record
 */
export interface ApiChange {
  type: ChangeType;
  endpoint: ApiEndpoint;
  previousState?: ApiEndpoint;
  changes: string[];
}

/**
 * Diff result between two API versions
 */
export interface ApiDiff {
  fromVersion: string;
  toVersion: string;
  timestamp: string;
  added: ApiEndpoint[];
  removed: ApiEndpoint[];
  modified: ApiChange[];
  breaking: ApiChange[];
  summary: DiffSummary;
}

/**
 * Summary of changes
 */
export interface DiffSummary {
  totalEndpoints: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  breakingCount: number;
  semverRecommendation: 'major' | 'minor' | 'patch';
}

/**
 * Parser configuration
 */
export interface ParserConfig {
  includePatterns: string[];
  excludePatterns: string[];
  framework?: 'express' | 'fastify' | 'nest' | 'koa' | 'hono' | 'auto';
  extractJSDoc: boolean;
  extractValidation: boolean;
  ignorePatterns: string[];
}

/**
 * Scan result
 */
export interface ScanResult {
  endpoints: ApiEndpoint[];
  filesScanned: number;
  errors: ScanError[];
  duration: number;
}

/**
 * Scan error
 */
export interface ScanError {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Documentation export format
 */
export type ExportFormat = 'markdown' | 'html' | 'openapi' | 'json';

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  outputPath: string;
  includeChanges?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  logoUrl?: string;
  customCss?: string;
}

/**
 * Framework detection result
 */
export interface FrameworkDetection {
  framework: 'express' | 'fastify' | 'nest' | 'koa' | 'hono' | 'unknown';
  confidence: number;
  version?: string;
}
