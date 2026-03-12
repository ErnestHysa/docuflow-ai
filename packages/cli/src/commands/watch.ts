/**
 * Watch command - Watch for changes and regenerate docs
 */

import { Command } from 'commander';
import chalk from 'chalk';
import chokidar from 'chokidar';
import path from 'path';
import { ApiScanner, DEFAULT_PARSER_CONFIG, DocumentationExporter, DEFAULT_EXPORT_OPTIONS } from '@docuflow/core';
import fs from 'fs';

export const watchCommand = new Command('watch')
  .description('Watch for file changes and auto-regenerate documentation')
  .option('-c, --config <path>', 'Path to config file', 'docuflow.config.json')
  .option('-o, --output <path>', 'Output directory')
  .option('--delay <ms>', 'Debounce delay in milliseconds', '500')
  .action(async (options) => {
    console.log(chalk.blue.bold('\n👀 DocuFlow Watch Mode\n'));

    // Load config
    const configPath = path.join(process.cwd(), options.config);
    let config: any = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch {
        config = {};
      }
    }

    const includePatterns = config.scan?.include || DEFAULT_PARSER_CONFIG.includePatterns;
    const excludePatterns = config.scan?.exclude || DEFAULT_PARSER_CONFIG.excludePatterns;
    const outputDir = options.output || config.output?.dir || './docs';

    console.log(chalk.dim('Watching files:'));
    includePatterns.forEach((p: string) => console.log(chalk.dim(`  ${p}`)));
    console.log(chalk.dim('\nPress Ctrl+C to stop\n'));

    // Debounce timer
    let timeout: NodeJS.Timeout | null = null;

    // Watcher
    const watcher = chokidar.watch(includePatterns, {
      ignored: excludePatterns,
      persistent: true,
      ignoreInitial: true,
    });

    // Rebuild function
    const rebuild = async () => {
      if (timeout) clearTimeout(timeout);

      timeout = setTimeout(async () => {
        console.log(chalk.dim('\n🔄 Changes detected, rescanning...'));

        try {
          const scanner = new ApiScanner({
            cwd: process.cwd(),
            config: {
              ...DEFAULT_PARSER_CONFIG,
              includePatterns,
              excludePatterns,
            },
          });

          const result = await scanner.scan();

          // Save scan results
          const docuflowDir = path.join(process.cwd(), '.docuflow');
          if (!fs.existsSync(docuflowDir)) {
            fs.mkdirSync(docuflowDir, { recursive: true });
          }
          fs.writeFileSync(path.join(docuflowDir, 'scan-results.json'), JSON.stringify(result, null, 2));

          // Save version
          const versionsDir = path.join(docuflowDir, 'versions');
          if (!fs.existsSync(versionsDir)) {
            fs.mkdirSync(versionsDir, { recursive: true });
          }
          const versionFile = path.join(versionsDir, `${Date.now()}.json`);
          fs.writeFileSync(versionFile, JSON.stringify({ version: config.version || '1.0.0', timestamp: new Date().toISOString(), endpoints: result.endpoints }, null, 2));

          // Generate docs
          const exporter = new DocumentationExporter();
          const outputPath = path.join(outputDir, 'api-docs.md');
          const content = await exporter.export({
            version: config.version || '1.0.0',
            timestamp: new Date().toISOString(),
            endpoints: result.endpoints,
          }, {
            ...DEFAULT_EXPORT_OPTIONS,
            format: 'markdown',
            outputPath,
          });

          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          fs.writeFileSync(outputPath, content, 'utf-8');

          console.log(chalk.green(`✅ Documentation updated: ${result.endpoints.length} endpoints\n`));

        } catch (error) {
          console.error(chalk.red('Error rebuilding docs:'), error instanceof Error ? error.message : String(error));
        }
      }, parseInt(options.delay));
    };

    // Set up watchers
    watcher.on('add', rebuild).on('change', rebuild).on('unlink', rebuild);

    // Initial scan
    await rebuild();

    // Keep process alive
    await new Promise(() => {});
  });
