/**
 * Storage Layer - Persists API versions and scan results
 * Using file-based storage for simplicity and compatibility
 */

import { join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import type { ApiVersion, ApiEndpoint, ApiDiff } from '@docuflow/core';

export interface StorageOptions {
  dataDir?: string;
}

/**
 * Storage class for managing DocuFlow data
 */
export class DocuFlowStorage {
  private dataDir: string;

  constructor(options: StorageOptions = {}) {
    this.dataDir = options.dataDir || join(process.cwd(), '.docuflow');
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Save an API version
   */
  saveVersion(version: ApiVersion): void {
    const versionId = `${version.version}_${Date.now()}`;
    const versionDir = join(this.dataDir, 'versions');
    if (!existsSync(versionDir)) {
      mkdirSync(versionDir, { recursive: true });
    }

    writeFileSync(join(versionDir, `${versionId}.json`), JSON.stringify(version, null, 2));

    // Update latest
    writeFileSync(join(this.dataDir, 'scan-results.json'), JSON.stringify(version, null, 2));
  }

  /**
   * Get the latest version
   */
  getLatestVersion(): ApiVersion | null {
    const scanResultsPath = join(this.dataDir, 'scan-results.json');
    if (!existsSync(scanResultsPath)) {
      return null;
    }

    try {
      const content = readFileSync(scanResultsPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get version by ID
   */
  getVersionById(versionId: string): ApiVersion | null {
    const versionPath = join(this.dataDir, 'versions', `${versionId}.json`);
    if (!existsSync(versionPath)) {
      return null;
    }

    try {
      const content = readFileSync(versionPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get all versions
   */
  getAllVersions(): ApiVersion[] {
    const versionDir = join(this.dataDir, 'versions');
    if (!existsSync(versionDir)) {
      return [];
    }

    const files = readdirSync(versionDir).filter(f => f.endsWith('.json'));
    const versions: ApiVersion[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(join(versionDir, file), 'utf-8');
        versions.push(JSON.parse(content));
      } catch {
        // Skip invalid files
      }
    }

    return versions.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Save a diff
   */
  saveDiff(diff: ApiDiff): void {
    const diffId = `${diff.fromVersion}_${diff.toVersion}_${Date.now()}`;
    const diffDir = join(this.dataDir, 'diffs');
    if (!existsSync(diffDir)) {
      mkdirSync(diffDir, { recursive: true });
    }

    writeFileSync(join(diffDir, `${diffId}.json`), JSON.stringify(diff, null, 2));
    writeFileSync(join(this.dataDir, 'diff-results.json'), JSON.stringify(diff, null, 2));
  }

  /**
   * Get latest diff
   */
  getLatestDiff(): ApiDiff | null {
    const diffPath = join(this.dataDir, 'diff-results.json');
    if (!existsSync(diffPath)) {
      return null;
    }

    try {
      const content = readFileSync(diffPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get diff between two versions
   */
  getDiff(fromVersion: string, toVersion: string): ApiDiff | null {
    const diffDir = join(this.dataDir, 'diffs');
    if (!existsSync(diffDir)) {
      return null;
    }

    const files = readdirSync(diffDir).filter(f =>
      f.startsWith(`${fromVersion}_${toVersion}`) && f.endsWith('.json')
    );

    if (files.length === 0) {
      return null;
    }

    try {
      const content = readFileSync(join(diffDir, files[files.length - 1]), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get all diffs
   */
  getAllDiffs(): ApiDiff[] {
    const diffDir = join(this.dataDir, 'diffs');
    if (!existsSync(diffDir)) {
      return [];
    }

    const files = readdirSync(diffDir).filter(f => f.endsWith('.json'));
    const diffs: ApiDiff[] = [];

    for (const file of files) {
      try {
        const content = readFileSync(join(diffDir, file), 'utf-8');
        diffs.push(JSON.parse(content));
      } catch {
        // Skip invalid files
      }
    }

    return diffs.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Search endpoints
   */
  searchEndpoints(query: string): ApiEndpoint[] {
    const version = this.getLatestVersion();
    if (!version) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    return version.endpoints.filter(endpoint =>
      endpoint.path.toLowerCase().includes(lowerQuery) ||
      endpoint.method.toLowerCase().includes(lowerQuery) ||
      endpoint.summary?.toLowerCase().includes(lowerQuery) ||
      endpoint.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Delete old versions (keep last N)
   */
  cleanup(keepLastN: number = 10): void {
    const versionDir = join(this.dataDir, 'versions');
    if (!existsSync(versionDir)) {
      return;
    }

    const files = readdirSync(versionDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: join(versionDir, f),
        mtime: statSync(join(versionDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // Delete old files
    for (const file of files.slice(keepLastN)) {
      try {
        const fs = require('fs');
        fs.unlinkSync(file.path);
      } catch {
        // Skip errors
      }
    }
  }

  /**
   * Close (no-op for file-based storage)
   */
  close(): void {
    // Nothing to close for file-based storage
  }

  /**
   * Export data as JSON
   */
  exportAsJson(): string {
    const versions = this.getAllVersions();
    const diffs = this.getAllDiffs();

    return JSON.stringify({
      versions,
      diffs,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Import data from JSON
   */
  importFromJson(json: string): void {
    const data = JSON.parse(json);

    if (data.versions) {
      const versionDir = join(this.dataDir, 'versions');
      if (!existsSync(versionDir)) {
        mkdirSync(versionDir, { recursive: true });
      }

      for (const version of data.versions) {
        const versionId = `${version.version}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        writeFileSync(join(versionDir, `${versionId}.json`), JSON.stringify(version, null, 2));
      }
    }

    if (data.diffs) {
      const diffDir = join(this.dataDir, 'diffs');
      if (!existsSync(diffDir)) {
        mkdirSync(diffDir, { recursive: true });
      }

      for (const diff of data.diffs) {
        const diffId = `${diff.fromVersion}_${diff.toVersion}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        writeFileSync(join(diffDir, `${diffId}.json`), JSON.stringify(diff, null, 2));
      }
    }
  }
}

/**
 * Factory function to create storage instance
 */
export function createStorage(options?: StorageOptions): DocuFlowStorage {
  return new DocuFlowStorage(options);
}
