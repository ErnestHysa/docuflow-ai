import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  // Try to load scan results from .docuflow directory
  const docuflowDir = join(process.cwd(), '.docuflow');
  const scanResultsPath = join(docuflowDir, 'scan-results.json');

  let data;

  if (existsSync(scanResultsPath)) {
    try {
      const scanResults = JSON.parse(readFileSync(scanResultsPath, 'utf-8'));

      // Check if this is an Electron IPC scan (paths start with ipc://)
      const isElectronIPC = scanResults.endpoints.some((e: any) => e.path?.startsWith('ipc://'));

      if (isElectronIPC) {
        // Format for Electron IPC display
        const groupedByType = scanResults.endpoints.reduce((acc: Record<string, any[]>, endpoint: any) => {
          const type = endpoint.metadata?.ipcType || 'unknown';
          if (!acc[type]) acc[type] = [];
          acc[type].push(endpoint);
          return acc;
        }, {} as Record<string, any[]>);

        const byType: Record<string, number> = {};
        for (const [type, endpoints] of Object.entries(groupedByType)) {
          byType[type] = (endpoints as any[]).length;
        }

        data = {
          project: scanResults.projectPath?.split('/').pop() || 'Electron App',
          type: 'electron',
          framework: 'Electron IPC',
          endpoints: scanResults.endpoints,
          stats: {
            total: scanResults.endpoints.length,
            byType,
          },
        };
      } else {
        // Regular HTTP API
        data = {
          version: { version: '1.0.0', timestamp: new Date().toISOString() },
          type: 'http',
          endpoints: scanResults.endpoints,
        };
      }
    } catch (e) {
      console.error('Failed to load scan results:', e);
    }
  }

  // Fallback to demo data if no scan results
  if (!data) {
    data = {
      project: 'Yggdrasil',
      type: 'electron',
      framework: 'Electron IPC',
      endpoints: [
        {
          id: 'handle:pick-folder',
          method: 'POST',
          path: 'ipc://pick-folder',
          summary: 'Open folder picker dialog',
          description: 'Opens a native folder picker dialog and returns the selected path',
          tags: ['Electron', 'IPC', 'Dialog', 'handle'],
          parameters: [],
          requestBody: { type: 'object', description: 'No parameters required' },
          responses: [{ statusCode: 200, description: 'Selected folder path' }],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'src/main/main.ts',
          sourceLine: 74,
          metadata: { channel: 'pick-folder', ipcType: 'handle' },
        },
        {
          id: 'handle:analyze-project',
          method: 'POST',
          path: 'ipc://analyze-project',
          summary: 'Analyze a project',
          description: 'Analyzes a project directory and builds an AST representation of all code files',
          tags: ['Electron', 'IPC', 'Analysis', 'handle'],
          parameters: [
            { name: 'projectPath', type: 'string', description: 'Path to project directory' },
          ],
          requestBody: { type: 'object', description: 'Project path to analyze' },
          responses: [{ statusCode: 200, description: 'Analysis complete with AST data' }],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'src/main/main.ts',
          sourceLine: 111,
          metadata: { channel: 'analyze-project', ipcType: 'handle' },
        },
        {
          id: 'handle:get-git-history',
          method: 'POST',
          path: 'ipc://get-git-history',
          summary: 'Get Git history for a file',
          description: 'Returns the commit history for a specific file in the project',
          tags: ['Electron', 'IPC', 'Git', 'handle'],
          parameters: [
            { name: 'filePath', type: 'string', description: 'Path to file (relative to project root)' },
          ],
          requestBody: { type: 'object', description: 'File path' },
          responses: [{ statusCode: 200, description: 'Array of commits' }],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'src/main/main.ts',
          sourceLine: 139,
          metadata: { channel: 'get-git-history', ipcType: 'handle' },
        },
        {
          id: 'handle:search-symbols',
          method: 'POST',
          path: 'ipc://search-symbols',
          summary: 'Search for symbols',
          description: 'Searches through all indexed symbols in the project',
          tags: ['Electron', 'IPC', 'Search', 'handle'],
          parameters: [
            { name: 'query', type: 'string', description: 'Search query string' },
            { name: 'options', type: 'object', description: 'Search options' },
          ],
          requestBody: { type: 'object', description: 'Search query and options' },
          responses: [{ statusCode: 200, description: 'Matching symbols' }],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'src/main/main.ts',
          sourceLine: 151,
          metadata: { channel: 'search-symbols', ipcType: 'handle' },
        },
        {
          id: 'handle:export-to-mermaid',
          method: 'POST',
          path: 'ipc://export-to-mermaid',
          summary: 'Export to Mermaid diagram',
          description: 'Exports the current project structure as a Mermaid diagram',
          tags: ['Electron', 'IPC', 'Export', 'handle'],
          parameters: [
            { name: 'options', type: 'object', description: 'Export options' },
          ],
          requestBody: { type: 'object', description: 'Export options' },
          responses: [{ statusCode: 200, description: 'Mermaid diagram string' }],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'src/main/main.ts',
          sourceLine: 162,
          metadata: { channel: 'export-to-mermaid', ipcType: 'handle' },
        },
        {
          id: 'handle:git-get-branches',
          method: 'POST',
          path: 'ipc://git-get-branches',
          summary: 'Get Git branches',
          description: 'Returns all branches in the repository',
          tags: ['Electron', 'IPC', 'Git', 'handle'],
          parameters: [],
          requestBody: { type: 'object', description: 'No parameters' },
          responses: [{ statusCode: 200, description: 'Array of branch names' }],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'src/main/main.ts',
          sourceLine: 239,
          metadata: { channel: 'git-get-branches', ipcType: 'handle' },
        },
        {
          id: 'handle:git-compare-branches',
          method: 'POST',
          path: 'ipc://git-compare-branches',
          summary: 'Compare Git branches',
          description: 'Compares two branches and shows differences',
          tags: ['Electron', 'IPC', 'Git', 'handle'],
          parameters: [
            { name: 'branchA', type: 'string', description: 'First branch name' },
            { name: 'branchB', type: 'string', description: 'Second branch name' },
          ],
          requestBody: { type: 'object', description: 'Branch names to compare' },
          responses: [{ statusCode: 200, description: 'Comparison results' }],
          authentication: { type: 'none' },
          deprecated: false,
          sourceFile: 'src/main/main.ts',
          sourceLine: 290,
          metadata: { channel: 'git-compare-branches', ipcType: 'handle' },
        },
      ],
      stats: {
        total: 23,
        byType: { handle: 23 },
      },
    };
  }

  return NextResponse.json(data);
}
