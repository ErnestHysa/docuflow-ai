/**
 * Scan command - Scan codebase for API endpoints
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { ApiScanner, DEFAULT_PARSER_CONFIG } from '@docuflow/core';

export const scanCommand = new Command('scan')
  .description('Scan your codebase for API endpoints')
  .option('-c, --config <path>', 'Path to config file', 'docuflow.config.json')
  .option('-o, --output <path>', 'Output file for scan results (JSON)')
  .option('--include <patterns...>', 'Files to include')
  .option('--exclude <patterns...>', 'Files to exclude')
  .option('-f, --framework <type>', 'Framework type (express, fastify, nest, electron)')
  .action(async (options) => {
    const framework = options.framework || 'express';
    const isElectron = framework.toLowerCase() === 'electron';

    if (isElectron) {
      console.log(chalk.blue('Scanning for Electron IPC channels...'));
    } else {
      console.log(chalk.blue('Scanning codebase...'));
    }

    try {
      // Load or create config
      const config = await loadConfig(options);

      // Get framework-specific parser
      const parser = await getParser(options.framework || config.framework || 'express');

      // Create scanner with parser
      const scanner = new ApiScanner({
        cwd: process.cwd(),
        config: {
          ...DEFAULT_PARSER_CONFIG,
          ...config,
          includePatterns: options.include || config.scan?.include || DEFAULT_PARSER_CONFIG.includePatterns,
          excludePatterns: options.exclude || config.scan?.exclude || DEFAULT_PARSER_CONFIG.excludePatterns,
        },
        parser,
      });

      // Scan
      const result = await scanner.scan();

      console.log(chalk.green(`✓ Found ${result.endpoints.length} API endpoints in ${result.filesScanned} files`));

      // Show results
      if (result.endpoints.length > 0) {
        const isElectron = result.endpoints.some(e => e.path?.startsWith('ipc://'));
        const label = isElectron ? 'IPC channels discovered' : 'Endpoints discovered';
        console.log(chalk.dim(`\n📡 ${label}:\n`));

        for (const endpoint of result.endpoints.slice(0, 10)) {
          const methodColor = getMethodColor(endpoint.method);
          const displayPath = endpoint.path?.replace('ipc://', '') || endpoint.path || '';
          console.log(`  ${methodColor(endpoint.method.padEnd(7))} ${chalk.cyan(displayPath)}`);
          if (endpoint.summary) {
            console.log(chalk.dim(`         ${endpoint.summary}`));
          }
          if (endpoint.metadata?.channel) {
            console.log(chalk.dim(`         Channel: ${endpoint.metadata.channel}`));
          }
        }

        if (result.endpoints.length > 10) {
          console.log(chalk.dim(`\n  ... and ${result.endpoints.length - 10} more`));
        }
      }

      // Show errors if any
      if (result.errors.length > 0) {
        console.log(chalk.yellow(`\n⚠️  ${result.errors.length} errors encountered:`));
        for (const error of result.errors.slice(0, 5)) {
          console.log(chalk.dim(`   ${error.file}:${error.line} - ${error.message}`));
        }
      }

      // Save results if output specified
      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
        console.log(chalk.dim(`\n💾 Results saved to: ${options.output}`));
      }

      // Save scan results to .docuflow directory
      const docuflowDir = path.join(process.cwd(), '.docuflow');
      if (!fs.existsSync(docuflowDir)) {
        fs.mkdirSync(docuflowDir, { recursive: true });
      }
      fs.writeFileSync(path.join(docuflowDir, 'scan-results.json'), JSON.stringify(result, null, 2));

    } catch (error) {
      console.error(chalk.red('Scan failed'));
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

async function loadConfig(options: { config: string }) {
  const configPath = path.join(process.cwd(), options.config);
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

async function getParser(framework: string) {
  try {
    switch (framework.toLowerCase()) {
      case 'express': {
        const { createExpressParser } = await import('@docuflow/parser-express');
        return createExpressParser({
          cwd: process.cwd(),
          config: DEFAULT_PARSER_CONFIG,
        });
      }
      case 'fastify': {
        const { createFastifyParser } = await import('@docuflow/parser-fastify');
        return createFastifyParser({
          cwd: process.cwd(),
          config: DEFAULT_PARSER_CONFIG,
        });
      }
      case 'nest': {
        const { createNestParser } = await import('@docuflow/parser-nest');
        return createNestParser({
          cwd: process.cwd(),
          config: DEFAULT_PARSER_CONFIG,
        });
      }
      case 'electron': {
        const { createElectronParser } = await import('@docuflow/parser-electron');
        return createElectronParser({
          cwd: process.cwd(),
          config: DEFAULT_PARSER_CONFIG,
        });
      }
      default: {
        const { createExpressParser } = await import('@docuflow/parser-express');
        return createExpressParser({
          cwd: process.cwd(),
          config: DEFAULT_PARSER_CONFIG,
        });
      }
    }
  } catch (error) {
    console.error(chalk.yellow(`Warning: Could not load ${framework} parser, using fallback`));
    // Return a minimal parser
    return {
      parseFile: () => [],
    };
  }
}

function getMethodColor(method: string): (text: string) => string {
  const colors: Record<string, (text: string) => string> = {
    GET: chalk.green,
    POST: chalk.blue,
    PUT: chalk.yellow,
    DELETE: chalk.red,
    PATCH: (s) => chalk.hex('#8b5cf6')(s),
    HEAD: (s) => chalk.hex('#6b7280')(s),
    OPTIONS: (s) => chalk.hex('#6b7280')(s),
  };
  return colors[method] || chalk.white;
}
