'use client';

import { useState, useEffect } from 'react';
import { Search, GitBranch, Zap, Shield, Menu, X, Sun, Moon, Cpu, Layers } from 'lucide-react';
import { ApiEndpoint, ApiVersion } from '@docuflow/core';

interface DocumentationData {
  project?: string;
  type?: 'http' | 'electron';
  framework?: string;
  version?: ApiVersion;
  endpoints: ApiEndpoint[];
  stats?: {
    total: number;
    byType?: Record<string, number>;
  };
}

export default function HomePage() {
  const [data, setData] = useState<DocumentationData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);

  useEffect(() => {
    // Load documentation data
    fetch('/api/docs')
      .then(res => res.json() as Promise<DocumentationData>)
      .then(setData)
      .catch(() => {
        // Fallback to sample data if API not available
        setData(getSampleData());
      });

    // Check for dark mode preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const isElectronIPC = data?.type === 'electron';

  const tags = data?.endpoints
    ? ['All', ...Array.from(new Set(data.endpoints.flatMap(e => e.tags || ['General'])))]
    : ['All'];

  const filteredEndpoints = data?.endpoints.filter(endpoint => {
    const displayPath = endpoint.path?.replace('ipc://', '') || '';
    const matchesSearch = displayPath.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         endpoint.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         endpoint.summary?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'All' || (endpoint.tags || ['General']).includes(selectedTag);
    return matchesSearch && matchesTag;
  }) || [];

  const groupedEndpoints = filteredEndpoints.reduce((acc, endpoint) => {
    // For IPC, group by ipcType (handle, on, send)
    const groupKey: string = isElectronIPC
      ? String(endpoint.metadata?.ipcType || 'other')
      : (endpoint.tags || ['General'])[0];
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(endpoint);
    return acc;
  }, {} as Record<string, ApiEndpoint[]>);

  // Format path for display
  const formatPath = (path: string): string => {
    return path.replace('ipc://', '');
  };

  // Get method badge color
  const getMethodBadgeClass = (method: string): string => {
    const methodLower = method.toLowerCase();
    return `method-badge method-${methodLower}`;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-card border-r border-border overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {isElectronIPC ? (
                <Cpu className="w-5 h-5 text-primary" />
              ) : (
                <Zap className="w-5 h-5 text-primary" />
              )}
              <h1 className="text-xl font-bold text-primary">DocuFlow AI</h1>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded hover:bg-accent"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={isElectronIPC ? "Search channels..." : "Search endpoints..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Project Info */}
        {data?.project && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{data.project}</span>
              {data.framework && (
                <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                  {data.framework}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Tags Filter */}
        <div className="p-4 border-b border-border">
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {tags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        {/* Endpoint List */}
        <nav className="flex-1 overflow-y-auto p-4">
          {Object.entries(groupedEndpoints).map(([group, endpoints]) => (
            <div key={group} className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase flex items-center gap-2">
                {group}
                <span className="px-1.5 py-0.5 text-xs bg-muted rounded">
                  {endpoints.length}
                </span>
              </h3>
              <ul className="space-y-1">
                {endpoints.map(endpoint => {
                  const displayPath = formatPath(endpoint.path);
                  return (
                    <li key={endpoint.id}>
                      <button
                        onClick={() => setSelectedEndpoint(endpoint)}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${
                          selectedEndpoint?.id === endpoint.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent'
                        }`}
                      >
                        <span className={getMethodBadgeClass(endpoint.method)}>
                          {endpoint.method}
                        </span>
                        <span className="text-sm truncate">{displayPath}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {data?.version?.version ? (
              <span>Version {data.version.version}</span>
            ) : (
              <span>{data?.framework || 'API'}</span>
            )}
            <span>{data?.endpoints.length || 0} {isElectronIPC ? 'channels' : 'endpoints'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-accent lg:hidden"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <GitBranch className="w-4 h-4" />
                <span>
                  {data?.endpoints.length || 0} {isElectronIPC ? 'IPC channels' : 'endpoints'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="max-w-4xl mx-auto p-6">
          {selectedEndpoint ? (
            <EndpointDetail endpoint={selectedEndpoint} isElectronIPC={isElectronIPC} />
          ) : (
            <div className="space-y-8">
              {/* Welcome */}
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  {isElectronIPC ? (
                    <Cpu className="w-8 h-8 text-primary" />
                  ) : (
                    <Zap className="w-8 h-8 text-primary" />
                  )}
                </div>
                <h2 className="text-3xl font-bold mb-2">
                  {isElectronIPC ? 'IPC Documentation' : 'API Documentation'}
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {data?.project && (
                    <span className="font-medium">{data.project}</span>
                  )}
                  {isElectronIPC
                    ? ' Inter-Process Communication channels. Select a channel from the sidebar to view details.'
                    : ' Welcome to the API documentation. Select an endpoint from the sidebar to view details.'}
                </p>
                {data?.framework && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm">
                    <Layers className="w-4 h-4" />
                    {data.framework}
                  </div>
                )}
              </div>

              {/* Stats by Type (for IPC) */}
              {isElectronIPC && data?.stats?.byType && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(data.stats.byType).map(([type, count]) => (
                    <div key={type} className="p-4 rounded-lg bg-card border border-border">
                      <div className="text-2xl font-bold text-primary">{count}</div>
                      <div className="text-sm text-muted-foreground capitalize">{type} channels</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Stats (for HTTP) */}
              {!isElectronIPC && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-2xl font-bold text-primary">
                      {data?.endpoints.filter(e => e.method === 'GET').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">GET endpoints</div>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-2xl font-bold text-primary">
                      {data?.endpoints.filter(e => e.method === 'POST').length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">POST endpoints</div>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <div className="text-2xl font-bold text-primary">
                      {data?.endpoints.filter(e => ['PUT', 'PATCH', 'DELETE'].includes(e.method)).length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Write endpoints</div>
                  </div>
                </div>
              )}

              {/* All Endpoints */}
              <div>
                <h3 className="text-xl font-semibold mb-4">
                  All {isElectronIPC ? 'Channels' : 'Endpoints'}
                </h3>
                <div className="space-y-2">
                  {filteredEndpoints.map(endpoint => {
                    const displayPath = formatPath(endpoint.path);
                    return (
                      <button
                        key={endpoint.id}
                        onClick={() => setSelectedEndpoint(endpoint)}
                        className="w-full p-4 rounded-lg bg-card border border-border hover:border-primary transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className={getMethodBadgeClass(endpoint.method)}>
                            {endpoint.method}
                          </span>
                          <code className="text-sm">{displayPath}</code>
                          {endpoint.deprecated && (
                            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">
                              Deprecated
                            </span>
                          )}
                          {isElectronIPC && endpoint.metadata?.ipcType != null && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded capitalize">
                              {String(endpoint.metadata.ipcType)}
                            </span>
                          )}
                        </div>
                        {endpoint.summary && (
                          <p className="mt-2 text-sm text-muted-foreground">{endpoint.summary}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EndpointDetail({ endpoint, isElectronIPC }: { endpoint: ApiEndpoint; isElectronIPC: boolean }) {
  const displayPath = endpoint.path?.replace('ipc://', '') || endpoint.path;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span className={`method-badge method-${endpoint.method.toLowerCase()} text-sm px-3 py-1.5`}>
            {endpoint.method}
          </span>
          <code className="text-lg">{displayPath}</code>
          {endpoint.deprecated && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">
              Deprecated
            </span>
          )}
          {isElectronIPC && endpoint.metadata?.ipcType != null && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded capitalize">
              {String(endpoint.metadata.ipcType)}
            </span>
          )}
          {isElectronIPC && endpoint.metadata?.channel != null && (
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded font-mono">
              channel: &quot;{String(endpoint.metadata.channel)}&quot;
            </span>
          )}
        </div>
        {endpoint.summary && (
          <h2 className="text-2xl font-bold">{endpoint.summary}</h2>
        )}
        {endpoint.description && (
          <p className="text-muted-foreground mt-2">{endpoint.description}</p>
        )}
      </div>

      {/* Authentication */}
      {endpoint.authentication && endpoint.authentication.type !== 'none' && (
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Authentication</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            This endpoint requires <code className="px-1 py-0.5 rounded bg-background">{endpoint.authentication.type}</code>
            authentication
          </p>
        </div>
      )}

      {/* Parameters */}
      {endpoint.parameters && endpoint.parameters.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Parameters</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4 font-medium">Name</th>
                  <th className="text-left py-2 px-4 font-medium">Type</th>
                  <th className="text-left py-2 px-4 font-medium">Location</th>
                  <th className="text-left py-2 px-4 font-medium">Required</th>
                  <th className="text-left py-2 px-4 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {endpoint.parameters.map(param => (
                  <tr key={param.name} className="border-b border-border">
                    <td className="py-2 px-4"><code>{param.name}</code></td>
                    <td className="py-2 px-4">{param.type}</td>
                    <td className="py-2 px-4">{param.location}</td>
                    <td className="py-2 px-4">{param.required ? 'Yes' : 'No'}</td>
                    <td className="py-2 px-4 text-muted-foreground">{param.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Body */}
      {endpoint.requestBody && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{isElectronIPC ? 'Payload' : 'Request Body'}</h3>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <pre className="text-sm overflow-x-auto">
              <code>{JSON.stringify(endpoint.requestBody.example || endpoint.requestBody, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Responses */}
      {endpoint.responses && endpoint.responses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{isElectronIPC ? 'Response' : 'Responses'}</h3>
          <div className="space-y-4">
            {endpoint.responses.map(response => (
              <div key={response.statusCode} className="border border-border rounded-lg overflow-hidden">
                <div className={`px-4 py-2 font-mono text-sm ${
                  response.statusCode < 300 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                  response.statusCode < 400 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  response.statusCode < 500 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {response.statusCode} - {response.description}
                </div>
                {!!response.example && (
                  <div className="p-4 bg-muted/30">
                    <pre className="text-sm overflow-x-auto">
                      <code>{JSON.stringify(response.example, null, 2)}</code>
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="text-sm text-muted-foreground">
        <p>Defined in: <code>{endpoint.sourceFile}:{endpoint.sourceLine}</code></p>
        {endpoint.metadata?.framework != null && (
          <p className="mt-1">Framework: <code>{String(endpoint.metadata.framework)}</code></p>
        )}
        {isElectronIPC && endpoint.metadata?.functionName != null && (
          <p className="mt-1">Handler: <code>{String(endpoint.metadata.functionName)}()</code></p>
        )}
      </div>
    </div>
  );
}

// Sample data for demonstration
function getSampleData(): DocumentationData {
  return {
    project: 'Demo API',
    type: 'http',
    framework: 'Express',
    version: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: [],
    },
    endpoints: [
      {
        id: 'GET:/api/users',
        method: 'GET',
        path: '/api/users',
        summary: 'List all users',
        description: 'Returns a paginated list of users',
        tags: ['Users'],
        parameters: [
          { name: 'page', type: 'number', location: 'query', required: false, description: 'Page number' },
          { name: 'limit', type: 'number', location: 'query', required: false, description: 'Items per page' },
        ],
        requestBody: undefined,
        responses: [
          { statusCode: 200, description: 'Successful response' },
          { statusCode: 401, description: 'Unauthorized' },
        ],
        authentication: { type: 'bearer', bearerFormat: 'JWT' },
        deprecated: false,
        sourceFile: 'src/routes/users.ts',
        sourceLine: 10,
        metadata: {},
      },
      {
        id: 'POST:/api/users',
        method: 'POST',
        path: '/api/users',
        summary: 'Create a new user',
        description: 'Creates a new user account',
        tags: ['Users'],
        parameters: [],
        requestBody: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'User email' },
            name: { type: 'string', description: 'User name' },
            password: { type: 'string', description: 'User password' },
          },
          required: ['email', 'name', 'password'],
          example: { email: 'user@example.com', name: 'John Doe', password: 'secret123' },
        },
        responses: [
          { statusCode: 201, description: 'User created successfully' },
          { statusCode: 400, description: 'Validation error' },
        ],
        authentication: { type: 'none' },
        deprecated: false,
        sourceFile: 'src/routes/users.ts',
        sourceLine: 25,
        metadata: {},
      },
      {
        id: 'GET:/api/users/:id',
        method: 'GET',
        path: '/api/users/:id',
        summary: 'Get user by ID',
        description: 'Returns a single user by their ID',
        tags: ['Users'],
        parameters: [
          { name: 'id', type: 'string', location: 'path', required: true, description: 'User ID' },
        ],
        requestBody: undefined,
        responses: [
          { statusCode: 200, description: 'User found' },
          { statusCode: 404, description: 'User not found' },
        ],
        authentication: { type: 'bearer', bearerFormat: 'JWT' },
        deprecated: false,
        sourceFile: 'src/routes/users.ts',
        sourceLine: 40,
        metadata: {},
      },
      {
        id: 'PUT:/api/users/:id',
        method: 'PUT',
        path: '/api/users/:id',
        summary: 'Update user',
        description: 'Updates an existing user',
        tags: ['Users'],
        parameters: [
          { name: 'id', type: 'string', location: 'path', required: true, description: 'User ID' },
        ],
        requestBody: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'User name' },
            email: { type: 'string', description: 'User email' },
          },
          example: { name: 'Jane Doe', email: 'jane@example.com' },
        },
        responses: [
          { statusCode: 200, description: 'User updated' },
          { statusCode: 404, description: 'User not found' },
        ],
        authentication: { type: 'bearer', bearerFormat: 'JWT' },
        deprecated: false,
        sourceFile: 'src/routes/users.ts',
        sourceLine: 55,
        metadata: {},
      },
      {
        id: 'DELETE:/api/users/:id',
        method: 'DELETE',
        path: '/api/users/:id',
        summary: 'Delete user',
        description: 'Deletes a user account',
        tags: ['Users'],
        parameters: [
          { name: 'id', type: 'string', location: 'path', required: true, description: 'User ID' },
        ],
        requestBody: undefined,
        responses: [
          { statusCode: 204, description: 'User deleted' },
          { statusCode: 404, description: 'User not found' },
        ],
        authentication: { type: 'bearer', bearerFormat: 'JWT' },
        deprecated: false,
        sourceFile: 'src/routes/users.ts',
        sourceLine: 70,
        metadata: {},
      },
      {
        id: 'POST:/api/auth/login',
        method: 'POST',
        path: '/api/auth/login',
        summary: 'User login',
        description: 'Authenticates a user and returns a JWT token',
        tags: ['Authentication'],
        parameters: [],
        requestBody: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'User email' },
            password: { type: 'string', description: 'User password' },
          },
          required: ['email', 'password'],
          example: { email: 'user@example.com', password: 'secret123' },
        },
        responses: [
          { statusCode: 200, description: 'Login successful', example: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } },
          { statusCode: 401, description: 'Invalid credentials' },
        ],
        authentication: { type: 'none' },
        deprecated: false,
        sourceFile: 'src/routes/auth.ts',
        sourceLine: 15,
        metadata: {},
      },
      {
        id: 'GET:/api/posts',
        method: 'GET',
        path: '/api/posts',
        summary: 'List posts',
        description: 'Returns a list of posts',
        tags: ['Posts'],
        parameters: [
          { name: 'page', type: 'number', location: 'query', required: false },
          { name: 'limit', type: 'number', location: 'query', required: false },
          { name: 'userId', type: 'string', location: 'query', required: false, description: 'Filter by user' },
        ],
        requestBody: undefined,
        responses: [
          { statusCode: 200, description: 'Successful response' },
        ],
        authentication: { type: 'none' },
        deprecated: false,
        sourceFile: 'src/routes/posts.ts',
        sourceLine: 8,
        metadata: {},
      },
    ],
  };
}
