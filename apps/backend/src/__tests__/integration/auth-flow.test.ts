/**
 * Authentication Flow Integration Tests
 * Tests the complete authentication flow including registration, login, and token refresh
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestUser } from '../helpers/test-helpers';

describe('Authentication Flow Integration', () => {
  let app: Express;
  let testUser: any;

  beforeAll(async () => {
    // Import app after test setup
    const { default: appInstance } = await import('../../index');
    app = appInstance;
  });

  beforeEach(() => {
    testUser = createTestUser();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'newuser@example.com',
        password: 'SecureP@ssw0rd123',
        firstName: 'New',
        lastName: 'User',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('newuser@example.com');
    });

    it('should return user-friendly error for duplicate email', async () => {
      // First registration
      await request(app).post('/api/auth/register').send({
        email: 'duplicate@example.com',
        password: 'SecureP@ssw0rd123',
      });

      // Second registration with same email
      const response = await request(app).post('/api/auth/register').send({
        email: 'duplicate@example.com',
        password: 'SecureP@ssw0rd123',
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already');
      expect(response.body.error.suggestion).toBeDefined();
    });

    it('should return user-friendly error for weak password', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: 'weakpass@example.com',
        password: 'weak',
      });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Password');
      expect(response.body.error.details).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register
      await request(app).post('/api/auth/register').send({
        email: 'login@example.com',
        password: 'SecureP@ssw0rd123',
      });

      // Then login
      const response = await request(app).post('/api/auth/login').send({
        email: 'login@example.com',
        password: 'SecureP@ssw0rd123',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('should return user-friendly error for invalid credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'WrongPassword123',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/auth/status', () => {
    it('should return authentication service status', async () => {
      const response = await request(app).get('/api/auth/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.emailPassword).toBeDefined();
      expect(response.body.data.googleOAuth).toBeDefined();
      expect(response.body.data.jwt).toBeDefined();
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid token', async () => {
      // Register and get token
      const registerResponse = await request(app).post('/api/auth/register').send({
        email: 'refresh@example.com',
        password: 'SecureP@ssw0rd123',
      });

      const token = registerResponse.body.data.token;

      // Refresh token
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.message).toContain('refreshed');
    });

    it('should return user-friendly error for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid token');
    });
  });
});
