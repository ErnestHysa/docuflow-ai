/**
 * Tests for core scanner functionality
 */

import { describe, it, expect } from 'vitest';
import { DiffEngine } from '../diff.js';

describe('DiffEngine', () => {
  it('should detect added endpoints', () => {
    const engine = new DiffEngine();
    const fromVersion = {
      version: '1.0.0',
      timestamp: '2026-01-01T00:00:00Z',
      endpoints: [],
    };
    const toVersion = {
      version: '1.1.0',
      timestamp: '2026-01-02T00:00:00Z',
      endpoints: [
        {
          id: 'GET:/api/users',
          method: 'GET' as const,
          path: '/api/users',
          tags: ['Users'],
          parameters: [],
          responses: [],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'test.ts',
          sourceLine: 1,
          metadata: {},
        },
      ],
    };

    const diff = engine.compare(fromVersion, toVersion);

    expect(diff.added).toHaveLength(1);
    expect(diff.summary.addedCount).toBe(1);
    expect(diff.summary.semverRecommendation).toBe('minor');
  });

  it('should detect removed endpoints', () => {
    const engine = new DiffEngine();
    const fromVersion = {
      version: '1.0.0',
      timestamp: '2026-01-01T00:00:00Z',
      endpoints: [
        {
          id: 'GET:/api/users',
          method: 'GET' as const,
          path: '/api/users',
          tags: ['Users'],
          parameters: [],
          responses: [],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'test.ts',
          sourceLine: 1,
          metadata: {},
        },
      ],
    };
    const toVersion = {
      version: '1.1.0',
      timestamp: '2026-01-02T00:00:00Z',
      endpoints: [],
    };

    const diff = engine.compare(fromVersion, toVersion);

    expect(diff.removed).toHaveLength(1);
    expect(diff.summary.removedCount).toBe(1);
    expect(diff.summary.semverRecommendation).toBe('major');
  });

  it('should detect breaking changes', () => {
    const engine = new DiffEngine();
    const fromVersion = {
      version: '1.0.0',
      timestamp: '2026-01-01T00:00:00Z',
      endpoints: [
        {
          id: 'GET:/api/users/:id',
          method: 'GET' as const,
          path: '/api/users/:id',
          tags: ['Users'],
          parameters: [
            { name: 'id', type: 'string', location: 'path', required: true },
          ],
          responses: [],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'test.ts',
          sourceLine: 1,
          metadata: {},
        },
      ],
    };
    const toVersion = {
      version: '1.1.0',
      timestamp: '2026-01-02T00:00:00Z',
      endpoints: [
        {
          id: 'GET:/api/users/:userId',
          method: 'GET' as const,
          path: '/api/users/:userId',
          tags: ['Users'],
          parameters: [
            { name: 'userId', type: 'string', location: 'path', required: true },
          ],
          responses: [],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'test.ts',
          sourceLine: 1,
          metadata: {},
        },
      ],
    };

    const diff = engine.compare(fromVersion, toVersion);

    expect(diff.breaking).toHaveLength(1);
    expect(diff.summary.breakingCount).toBe(1);
    expect(diff.summary.semverRecommendation).toBe('major');
  });

  it('should generate changelog markdown', () => {
    const engine = new DiffEngine();
    const fromVersion = {
      version: '1.0.0',
      timestamp: '2026-01-01T00:00:00Z',
      endpoints: [],
    };
    const toVersion = {
      version: '1.1.0',
      timestamp: '2026-01-02T00:00:00Z',
      endpoints: [
        {
          id: 'GET:/api/users',
          method: 'GET' as const,
          path: '/api/users',
          tags: ['Users'],
          parameters: [],
          responses: [],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'test.ts',
          sourceLine: 1,
          metadata: {},
        },
      ],
    };

    const diff = engine.compare(fromVersion, toVersion);
    const changelog = engine.generateChangelog(diff);

    expect(changelog).toContain('# API Changelog');
    expect(changelog).toContain('1.1.0');
    expect(changelog).toContain('+1 added');
    expect(changelog).toContain('GET /api/users');
  });
});
