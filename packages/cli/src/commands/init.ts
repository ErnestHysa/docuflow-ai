/**
 * Init command - Initialize DocuFlow configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export const initCommand = new Command('init')
  .description('Initialize DocuFlow configuration in your project')
  .option('-y, --yes', 'Skip prompts with defaults')
  .action((options) => {
    console.log(chalk.blue.bold('\n🚀 Welcome to DocuFlow AI!\n'));

    // Use defaults
    const config = {
      $schema: 'https://docuflow.ai/schema/config.json',
      scan: {
        include: ['src/**/*.ts'],
        exclude: ['**/*.test.ts', '**/node_modules/**'],
      },
      output: {
        dir: './docs',
        formats: ['markdown', 'html'],
      },
      framework: 'auto',
    };

    // Write config file
    const configPath = path.join(process.cwd(), 'docuflow.config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log(chalk.green('\n✅ Configuration created!'));
    console.log(chalk.dim(`   File: ${configPath}`));
    console.log(chalk.dim('\n   Next steps:'));
    console.log(chalk.dim('   1. Review the configuration'));
    console.log(chalk.dim('   2. Run: docuflow scan'));
    console.log(chalk.dim('   3. Run: docuflow generate\n'));
  });
