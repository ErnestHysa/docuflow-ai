/**
 * API Scanner - Discovers API endpoints in codebase
 */

import { glob } from 'tinyglobby';
import { minimatch } from 'minimatch';
import type { ParserConfig, ScanResult, ScanError, ApiEndpoint } from './types/index.js';
import { TypeScriptParser } from './parser/typescript.js';

export interface ScannerOptions {
  cwd: string;
  config: ParserConfig;
  parser?: any; // Optional external parser (Express/Fastify/Nest)
}

/**
 * Main scanner class for discovering API endpoints
 */
export class ApiScanner {
  private options: ScannerOptions;

  constructor(options: ScannerOptions) {
    this.options = options;
  }

  /**
   * Scan the codebase for API endpoints
   */
  async scan(): Promise<ScanResult> {
    const startTime = Date.now();
    const errors: ScanError[] = [];
    const endpoints: ApiEndpoint[] = [];

    // Find matching files
    const files = await this.findFiles();

    // Get parser - use external parser if provided, otherwise use TypeScript parser
    const parser = this.options.parser || new TypeScriptParser();

    // Parse each file
    for (const file of files) {
      try {
        // Handle different parser interfaces
        let fileEndpoints: ApiEndpoint[];
        if (typeof parser.parseFile === 'function') {
          const result = parser.parseFile(file);
          fileEndpoints = Array.isArray(result) ? await Promise.resolve(result) : await result;
        } else {
          fileEndpoints = [];
        }
        endpoints.push(...fileEndpoints);
      } catch (error) {
        errors.push({
          file,
          line: 0,
          message: error instanceof Error ? error.message : String(error),
          severity: 'error',
        });
      }
    }

    return {
      endpoints,
      filesScanned: files.length,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Find files matching include patterns
   */
  private async findFiles(): Promise<string[]> {
    const { includePatterns, excludePatterns, ignorePatterns } = this.options.config;

    const allPatterns = [...includePatterns];
    const allGlobs = [...excludePatterns, ...ignorePatterns];

    const matches = await glob(allPatterns, {
      cwd: this.options.cwd,
      ignore: allGlobs,
      absolute: true,
    });

    return matches;
  }

  /**
   * Detect the framework used in the project
   */
  async detectFramework(): Promise<string> {
    // Check package.json dependencies
    // Check import patterns
    // Return detected framework
    return this.options.config.framework || 'auto';
  }
}
