/**
 * Diff command - Show changes between API versions
 */

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { DiffEngine } from '@docuflow/core';

export const diffCommand = new Command('diff')
  .description('Show API changes between versions')
  .option('--from <version>', 'Previous version (default: last saved)')
  .option('--to <version>', 'Current version (default: current scan)')
  .option('-f, --format <format>', 'Output format (text, markdown, json)', 'text')
  .action(async (options) => {
    console.log(chalk.blue('Computing diff...'));

    try {
      // Load current scan results
      const currentPath = path.join(process.cwd(), '.docuflow', 'scan-results.json');
      if (!fs.existsSync(currentPath)) {
        console.error(chalk.red('No scan results found. Run "docuflow scan" first.'));
        process.exit(1);
      }
      const current = JSON.parse(fs.readFileSync(currentPath, 'utf-8'));

      if (!current || !current.endpoints) {
        console.error(chalk.red('No scan results found. Run "docuflow scan" first.'));
        process.exit(1);
      }

      // Load previous version
      const docuflowDir = path.join(process.cwd(), '.docuflow');
      const versionsDir = path.join(docuflowDir, 'versions');

      let fromVersion: any;

      if (options.from) {
        const fromPath = path.join(versionsDir, `${options.from}.json`);
        if (!fs.existsSync(fromPath)) {
          console.error(chalk.red(`Version ${options.from} not found`));
          process.exit(1);
        }
        fromVersion = JSON.parse(fs.readFileSync(fromPath, 'utf-8'));
      } else {
        // Get most recent version
        if (fs.existsSync(versionsDir)) {
          const versions = fs.readdirSync(versionsDir).filter(f => f.endsWith('.json'));
          if (versions.length > 0) {
            const latest = versions.sort().reverse()[0];
            fromVersion = JSON.parse(fs.readFileSync(path.join(versionsDir, latest), 'utf-8'));
          } else {
            console.warn(chalk.yellow('No previous version found. This is the first scan.'));
            return;
          }
        } else {
          console.warn(chalk.yellow('No previous version found. This is the first scan.'));
          return;
        }
      }

      // Create API versions
      const fromApiVersion = {
        version: fromVersion.version || 'previous',
        timestamp: fromVersion.timestamp,
        endpoints: fromVersion.endpoints,
      };

      const toApiVersion = {
        version: options.to || 'current',
        timestamp: new Date().toISOString(),
        endpoints: current.endpoints,
      };

      // Compute diff
      const engine = new DiffEngine();
      const diff = engine.compare(fromApiVersion, toApiVersion);

      console.log(chalk.green('✓ Diff computed'));

      // Save diff for later use
      if (!fs.existsSync(docuflowDir)) {
        fs.mkdirSync(docuflowDir, { recursive: true });
      }
      fs.writeFileSync(path.join(docuflowDir, 'diff-results.json'), JSON.stringify(diff, null, 2));

      // Display results based on format
      if (options.format === 'json') {
        console.log(JSON.stringify(diff, null, 2));
      } else if (options.format === 'markdown') {
        console.log(engine.generateChangelog(diff));
      } else {
        displayTextDiff(diff);
      }

    } catch (error) {
      console.error(chalk.red('Diff failed'));
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

function displayTextDiff(diff: ReturnType<DiffEngine['compare']>) {
  console.log(chalk.bold(`\n📊 API Changes: ${diff.fromVersion} → ${diff.toVersion}\n`));

  // Summary
  console.log(chalk.dim('Summary:'));
  console.log(`  ${chalk.green(`+${diff.summary.addedCount} added`)}`);
  console.log(`  ${chalk.red(`-${diff.summary.removedCount} removed`)}`);
  console.log(`  ${chalk.yellow(`~${diff.summary.modifiedCount} modified`)}`);
  if (diff.summary.breakingCount > 0) {
    console.log(`  ${chalk.red.bold(`⚠️ ${diff.summary.breakingCount} breaking`)}`);
  }
  console.log(`  Semver recommendation: ${chalk.bold(diff.summary.semverRecommendation)}`);

  // Breaking changes
  if (diff.breaking.length > 0) {
    console.log(chalk.red.bold('\n⚠️ Breaking Changes:\n'));
    for (const change of diff.breaking) {
      console.log(`  ${chalk.red.bold('●')} ${change.endpoint.method} ${change.endpoint.path}`);
      for (const detail of change.changes) {
        console.log(chalk.dim(`      ${detail}`));
      }
    }
  }

  // Added
  if (diff.added.length > 0) {
    console.log(chalk.green.bold('\n✨ Added:\n'));
    for (const endpoint of diff.added.slice(0, 10)) {
      console.log(`  ${chalk.green('+')} ${endpoint.method} ${endpoint.path}`);
    }
    if (diff.added.length > 10) {
      console.log(chalk.dim(`  ... and ${diff.added.length - 10} more`));
    }
  }

  // Removed
  if (diff.removed.length > 0) {
    console.log(chalk.red.bold('\n🗑️ Removed:\n'));
    for (const endpoint of diff.removed.slice(0, 10)) {
      console.log(`  ${chalk.red('-')} ${endpoint.method} ${endpoint.path}`);
    }
    if (diff.removed.length > 10) {
      console.log(chalk.dim(`  ... and ${diff.removed.length - 10} more`));
    }
  }

  // Modified (non-breaking)
  const nonBreaking = diff.modified.filter((m) => m.type !== 'breaking');
  if (nonBreaking.length > 0) {
    console.log(chalk.yellow.bold('\n🔄 Modified:\n'));
    for (const change of nonBreaking.slice(0, 10)) {
      console.log(`  ${chalk.yellow('~')} ${change.endpoint.method} ${change.endpoint.path}`);
    }
    if (nonBreaking.length > 10) {
      console.log(chalk.dim(`  ... and ${nonBreaking.length - 10} more`));
    }
  }

  console.log('');
}
