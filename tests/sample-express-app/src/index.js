/**
 * Sample Express.js Application
 * This is a demo app to test DocuFlow AI's API documentation generation
 */

import express from 'express';

const app = express();
app.use(express.json());

/**
 * @tag Users
 * @auth bearer JWT
 */
const router = express.Router();

/**
 * List all users
 * @param page - Page number for pagination
 * @param limit - Number of items per page
 * @returns 200 - Successful response with user list
 * @returns 401 - Unauthorized
 */
router.get('/api/users', (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  res.json({
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ],
    pagination: { page: Number(page), limit: Number(limit), total: 100 },
  });
});

/**
 * Get user by ID
 * @param id - User ID
 * @returns 200 - User found
 * @returns 404 - User not found
 */
router.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id, name: 'John Doe', email: 'john@example.com' });
});

/**
 * Create a new user
 * @body {
 *   "email": "user@example.com",
 *   "name": "John Doe",
 *   "password": "secret123"
 * }
 * @returns 201 - User created successfully
 * @returns 400 - Validation error
 */
router.post('/api/users', (req, res) => {
  const { email, name, password } = req.body;
  res.status(201).json({ id: 3, email, name });
});

/**
 * Update user
 * @param id - User ID
 * @body {
 *   "name": "Jane Doe",
 *   "email": "jane@example.com"
 * }
 * @returns 200 - User updated
 * @returns 404 - User not found
 */
router.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  res.json({ id, name, email });
});

/**
 * Delete user
 * @param id - User ID
 * @returns 204 - User deleted
 * @returns 404 - User not found
 */
router.delete('/api/users/:id', (req, res) => {
  res.status(204).send();
});

/**
 * @tag Authentication
 */

/**
 * User login
 * @body {
 *   "email": "user@example.com",
 *   "password": "secret123"
 * }
 * @returns 200 - Login successful
 * @returns 401 - Invalid credentials
 * @example {"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
 */
router.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  res.json({ token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123' });
});

/**
 * @tag Posts
 */

/**
 * List posts
 * @param page - Page number
 * @param limit - Items per page
 * @param userId - Filter by user ID
 * @returns 200 - Posts retrieved
 */
router.get('/api/posts', (req, res) => {
  const { page = 1, limit = 10, userId } = req.query;
  res.json({
    posts: [
      { id: 1, title: 'First Post', content: 'Hello World', userId: 1 },
      { id: 2, title: 'Second Post', content: 'More content', userId: 1 },
    ],
    pagination: { page: Number(page), limit: Number(limit), total: 50 },
  });
});

/**
 * Create a new post
 * @body {
 *   "title": "My Post",
 *   "content": "Post content",
 *   "userId": 1
 * }
 * @returns 201 - Post created
 * @returns 400 - Validation error
 * @auth bearer JWT
 */
router.post('/api/posts', (req, res) => {
  const { title, content, userId } = req.body;
  res.status(201).json({ id: 3, title, content, userId, createdAt: new Date().toISOString() });
});

app.use(router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sample API server running on http://localhost:${PORT}`);
});
