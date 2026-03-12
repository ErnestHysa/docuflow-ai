/**
 * Export command - Export documentation in various formats
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { DocumentationExporter, DEFAULT_EXPORT_OPTIONS } from '@docuflow/core';

export const exportCommand = new Command('export')
  .description('Export documentation in various formats')
  .argument('<format>', 'Export format: markdown, html, openapi, json')
  .option('-o, --output <path>', 'Output file path')
  .option('--open', 'Open the exported file')
  .action(async (format, options) => {
    console.log(chalk.blue('Exporting documentation...'));

    try {
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
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: scanResults.endpoints,
      };

      // Determine output path
      const ext = getFileExtension(format);
      const outputPath = options.output || path.join(process.cwd(), `api-docs.${ext}`);

      // Export
      const exporter = new DocumentationExporter();
      const content = await exporter.export(apiVersion, {
        ...DEFAULT_EXPORT_OPTIONS,
        format: format as any,
        outputPath,
      });

      fs.writeFileSync(outputPath, content, 'utf-8');

      console.log(chalk.green(`✓ Exported to: ${outputPath}`));

      // Open if requested
      if (options.open) {
        const { exec } = await import('child_process');
        const openCommand = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
        exec(`${openCommand} "${outputPath}"`);
      }

    } catch (error) {
      console.error(chalk.red('Export failed'));
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
