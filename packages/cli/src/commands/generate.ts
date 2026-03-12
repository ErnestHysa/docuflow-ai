/**
 * Generate command - Generate documentation from scan results
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { DocumentationExporter, DEFAULT_EXPORT_OPTIONS } from '@docuflow/core';

export const generateCommand = new Command('generate')
  .description('Generate documentation from scan results')
  .option('-c, --config <path>', 'Path to config file', 'docuflow.config.json')
  .option('-o, --output <path>', 'Output directory')
  .option('-f, --format <format>', 'Output format (markdown, html, openapi, json)', 'markdown')
  .option('--include-changes', 'Include changelog if diff available')
  .action(async (options) => {
    console.log(chalk.blue('Generating documentation...'));

    try {
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

      // Load scan results
      const scanPath = path.join(process.cwd(), '.docuflow', 'scan-results.json');
      if (!fs.existsSync(scanPath)) {
        console.error(chalk.red('No scan results found. Run "docuflow scan" first.'));
        process.exit(1);
      }
      const scanResults = JSON.parse(fs.readFileSync(scanPath, 'utf-8'));

      if (!scanResults || !scanResults.endpoints) {
        console.error(chalk.red('No scan results found. Run "docuflow scan" first.'));
        process.exit(1);
      }

      // Create API version
      const apiVersion = {
        version: config.version || '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: scanResults.endpoints,
      };

      // Load diff if available
      let diff;
      const diffPath = path.join(process.cwd(), '.docuflow', 'diff-results.json');
      if (options.includeChanges && fs.existsSync(diffPath)) {
        diff = JSON.parse(fs.readFileSync(diffPath, 'utf-8'));
      }

      // Determine output directory
      const outputDir = options.output || config.output?.dir || './docs';
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Generate documentation
      const exporter = new DocumentationExporter();
      const format = options.format as any;
      const outputPath = path.join(outputDir, `api-docs.${getFileExtension(format)}`);

      const content = await exporter.export(apiVersion, {
        ...DEFAULT_EXPORT_OPTIONS,
        format,
        outputPath,
        includeChanges: options.includeChanges,
        theme: config.output?.theme || 'auto',
        logoUrl: config.output?.logoUrl,
        customCss: config.output?.customCss,
      }, diff);

      // Write output
      fs.writeFileSync(outputPath, content, 'utf-8');

      console.log(chalk.green(`✓ Documentation generated: ${outputPath}`));

      // Show summary
      console.log(chalk.dim('\n📊 Summary:'));
      console.log(chalk.dim(`   Endpoints: ${apiVersion.endpoints.length}`));
      console.log(chalk.dim(`   Format: ${format}`));
      console.log(chalk.dim(`   Output: ${outputPath}\n`));

    } catch (error) {
      console.error(chalk.red('Generation failed'));
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

function getFileExtension(format: string): string {
  const extensions: Record<string, string> = {
    markdown: 'md',
    html: 'html',
    openapi: 'json',
    json: 'json',
  };
  return extensions[format] || 'md';
}
