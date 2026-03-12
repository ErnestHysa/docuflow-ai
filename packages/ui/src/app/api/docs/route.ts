import { NextResponse } from 'next/server';

export async function GET() {
  // In production, this would read from the actual scan results
  // For now, return sample data
  const data = {
    version: {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
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
    },
    endpoints: [],
  };

  return NextResponse.json(data);
}
