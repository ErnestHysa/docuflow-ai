/**
 * Change Detection Engine - Detects and visualizes API changes
 */

import type { ApiEndpoint, ApiVersion, ApiDiff, ApiChange, DiffSummary, ChangeType } from './types/index.js';

/**
 * Compare two API versions and detect changes
 */
export class DiffEngine {
  /**
   * Generate a diff between two API versions
   */
  compare(from: ApiVersion, to: ApiVersion): ApiDiff {
    const added: ApiEndpoint[] = [];
    const removed: ApiEndpoint[] = [];
    const modified: ApiChange[] = [];
    const breaking: ApiChange[] = [];

    // Create endpoint lookup maps
    const fromMap = new Map<string, ApiEndpoint>(from.endpoints.map((e) => [this.endpointKey(e), e]));
    const toMap = new Map<string, ApiEndpoint>(to.endpoints.map((e) => [this.endpointKey(e), e]));

    const allKeys = new Set<string>([...fromMap.keys(), ...toMap.keys()]);

    for (const key of allKeys) {
      const fromEndpoint = fromMap.get(key);
      const toEndpoint = toMap.get(key);

      if (!fromEndpoint) {
        // New endpoint
        added.push(toEndpoint!);
      } else if (!toEndpoint) {
        // Removed endpoint
        removed.push(fromEndpoint);
      } else {
        // Compare for modifications
        const changes = this.compareEndpoints(fromEndpoint, toEndpoint);
        if (changes.length > 0) {
          const change: ApiChange = {
            type: this.determineChangeType(changes),
            endpoint: toEndpoint,
            previousState: fromEndpoint,
            changes,
          };

          modified.push(change);

          if (change.type === 'breaking') {
            breaking.push(change);
          }
        }
      }
    }

    return {
      fromVersion: from.version,
      toVersion: to.version,
      timestamp: new Date().toISOString(),
      added,
      removed,
      modified,
      breaking,
      summary: this.generateSummary(from.endpoints.length, to.endpoints.length, added.length, removed.length, modified.length, breaking.length),
    };
  }

  /**
   * Generate unique key for an endpoint
   */
  private endpointKey(endpoint: ApiEndpoint): string {
    return `${endpoint.method}:${endpoint.path}`;
  }

  /**
   * Compare two endpoints and return list of changes
   */
  private compareEndpoints(from: ApiEndpoint, to: ApiEndpoint): string[] {
    const changes: string[] = [];

    // Check path changes (breaking)
    if (from.path !== to.path) {
      changes.push(`Path changed from ${from.path} to ${to.path}`);
    }

    // Check method changes (breaking)
    if (from.method !== to.method) {
      changes.push(`Method changed from ${from.method} to ${to.method}`);
    }

    // Check deprecation
    if (!from.deprecated && to.deprecated) {
      changes.push('Endpoint marked as deprecated');
    }

    // Check parameters
    const paramChanges = this.compareParameters(from.parameters, to.parameters);
    changes.push(...paramChanges);

    // Check request body
    const bodyChanges = this.compareSchemas(from.requestBody, to.requestBody, 'Request body');
    changes.push(...bodyChanges);

    // Check responses
    const responseChanges = this.compareResponses(from.responses, to.responses);
    changes.push(...responseChanges);

    // Check authentication
    const authChanges = this.compareAuth(from.authentication, to.authentication);
    changes.push(...authChanges);

    // Check description/summary (non-breaking)
    if (from.description !== to.description) {
      changes.push('Description updated');
    }

    return changes;
  }

  /**
   * Compare parameters
   */
  private compareParameters(fromParams: ApiEndpoint['parameters'], toParams: ApiEndpoint['parameters']): string[] {
    const changes: string[] = [];
    const fromMap = new Map<string, ApiEndpoint['parameters'][0]>(fromParams.map((p) => [p.name, p]));
    const toMap = new Map<string, ApiEndpoint['parameters'][0]>(toParams.map((p) => [p.name, p]));

    // Check for removed required parameters (breaking)
    for (const param of fromParams) {
      const toParam = toMap.get(param.name);
      if (!toParam) {
        changes.push(`Removed parameter: ${param.name}`);
      } else if (param.required && !toParam.required) {
        changes.push(`Parameter ${param.name} changed from required to optional`);
      } else if (param.type !== toParam.type) {
        changes.push(`Parameter ${param.name} type changed from ${param.type} to ${toParam.type}`);
      }
    }

    // Check for added parameters
    for (const param of toParams) {
      if (!fromMap.has(param.name)) {
        if (param.required) {
          changes.push(`Added required parameter: ${param.name}`);
        }
      }
    }

    return changes;
  }

  /**
   * Compare schemas
   */
  private compareSchemas(
    from: ApiEndpoint['requestBody'],
    to: ApiEndpoint['requestBody'],
    path: string
  ): string[] {
    const changes: string[] = [];

    if (!from && to) {
      changes.push(`Added ${path}`);
    } else if (from && !to) {
      changes.push(`Removed ${path}`);
    } else if (from && to) {
      // Compare schema properties
      if (from.type !== to.type) {
        changes.push(`${path} type changed from ${from.type} to ${to.type}`);
      }

      if (from.required && to.required && from.required.length !== to.required.length) {
        changes.push(`${path} required fields changed`);
      }
    }

    return changes;
  }

  /**
   * Compare response definitions
   */
  private compareResponses(from: ApiEndpoint['responses'], to: ApiEndpoint['responses']): string[] {
    const changes: string[] = [];
    const fromMap = new Map<number, ApiEndpoint['responses'][0]>(from.map((r) => [r.statusCode, r]));
    const toMap = new Map<number, ApiEndpoint['responses'][0]>(to.map((r) => [r.statusCode, r]));

    // Check for removed response codes (breaking)
    for (const response of from) {
      if (!toMap.has(response.statusCode)) {
        changes.push(`Removed response: ${response.statusCode}`);
      }
    }

    // Check for added response codes
    for (const response of to) {
      if (!fromMap.has(response.statusCode)) {
        changes.push(`Added response: ${response.statusCode}`);
      }
    }

    return changes;
  }

  /**
   * Compare authentication
   */
  private compareAuth(from: ApiEndpoint['authentication'], to: ApiEndpoint['authentication']): string[] {
    const changes: string[] = [];

    if (from.type !== to.type) {
      changes.push(`Authentication changed from ${from.type} to ${to.type}`);
    }

    return changes;
  }

  /**
   * Determine if changes are breaking
   */
  private determineChangeType(changes: string[]): ChangeType {
    const breakingPatterns = [
      'Path changed',
      'Method changed',
      'Removed parameter',
      'changed from required to optional',
      'type changed',
      'Removed response',
      'Removed',
      'Authentication changed',
    ];

    for (const change of changes) {
      for (const pattern of breakingPatterns) {
        if (change.includes(pattern)) {
          return 'breaking';
        }
      }
    }

    return 'modified';
  }

  /**
   * Generate diff summary
   */
  private generateSummary(
    fromCount: number,
    toCount: number,
    added: number,
    removed: number,
    modified: number,
    breaking: number
  ): DiffSummary {
    // Determine semver recommendation
    let semverRecommendation: DiffSummary['semverRecommendation'] = 'patch';
    if (breaking > 0 || removed > 0) {
      semverRecommendation = 'major';
    } else if (added > 0) {
      semverRecommendation = 'minor';
    }

    return {
      totalEndpoints: toCount,
      addedCount: added,
      removedCount: removed,
      modifiedCount: modified,
      breakingCount: breaking,
      semverRecommendation,
    };
  }

  /**
   * Generate changelog markdown from diff
   */
  generateChangelog(diff: ApiDiff): string {
    const lines: string[] = [];

    lines.push(`# API Changelog`);
    lines.push(`\n## ${diff.toVersion} - ${new Date(diff.timestamp).toLocaleDateString()}\n`);

    if (diff.breaking.length > 0) {
      lines.push(`### ⚠️ Breaking Changes\n`);
      for (const change of diff.breaking) {
        lines.push(`- **${change.endpoint.method} ${change.endpoint.path}**`);
        for (const detail of change.changes) {
          lines.push(`  - ${detail}`);
        }
      }
      lines.push('');
    }

    if (diff.added.length > 0) {
      lines.push(`### ✨ Added\n`);
      for (const endpoint of diff.added) {
        lines.push(`- ${endpoint.method} ${endpoint.path}`);
      }
      lines.push('');
    }

    if (diff.removed.length > 0) {
      lines.push(`### 🗑️ Removed\n`);
      for (const endpoint of diff.removed) {
        lines.push(`- ${endpoint.method} ${endpoint.path}`);
      }
      lines.push('');
    }

    if (diff.modified.length > 0) {
      lines.push(`### 🔄 Modified\n`);
      for (const change of diff.modified) {
        if (change.type !== 'breaking') {
          lines.push(`- ${change.endpoint.method} ${change.endpoint.path}`);
          for (const detail of change.changes) {
            lines.push(`  - ${detail}`);
          }
        }
      }
      lines.push('');
    }

    lines.push(`\n---\n`);
    lines.push(`**Summary:** ${diff.summary.addedCount} added, ${diff.summary.removedCount} removed, ${diff.summary.modifiedCount} modified, ${diff.summary.breakingCount} breaking`);
    lines.push(`**Semver Recommendation:** ${diff.summary.semverRecommendation}`);

    return lines.join('\n');
  }

  /**
   * Generate visual HTML diff
   */
  generateVisualDiff(diff: ApiDiff): string {
    // Generate HTML with side-by-side comparison
    // This would include color-coded changes
    return `
<div class="docuflow-diff">
  <div class="summary">
    <h2>API Changes: ${diff.fromVersion} → ${diff.toVersion}</h2>
    <div class="stats">
      <span class="added">+${diff.summary.addedCount} added</span>
      <span class="removed">-${diff.summary.removedCount} removed</span>
      <span class="modified">~${diff.summary.modifiedCount} modified</span>
      ${diff.summary.breakingCount > 0 ? `<span class="breaking">⚠️ ${diff.summary.breakingCount} breaking</span>` : ''}
    </div>
  </div>
  <!-- Detailed changes would go here -->
</div>
    `.trim();
  }
}
