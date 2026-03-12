#!/usr/bin/env node
/**
 * DocuFlow CLI - Main entry point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init.js';
import { scanCommand } from './commands/scan.js';
import { generateCommand } from './commands/generate.js';
import { diffCommand } from './commands/diff.js';
import { watchCommand } from './commands/watch.js';
import { exportCommand } from './commands/export.js';

const program = new Command();

program
  .name('docuflow')
  .description('AI-Powered API Documentation Generator with Live Change Detection')
  .version('0.1.0');

// Initialize command
program.addCommand(initCommand);

// Scan command
program.addCommand(scanCommand);

// Generate command
program.addCommand(generateCommand);

// Diff command
program.addCommand(diffCommand);

// Watch command
program.addCommand(watchCommand);

// Export command
program.addCommand(exportCommand);

// Parse arguments
program.parseAsync(process.argv).catch((error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});
