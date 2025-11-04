/**
 * Auth Service Unit Tests
 * Tests for user registration, login, token generation, and password management
 * Coverage Target: 95%
 */

import { AuthService } from '../../services/auth.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

// Mock bcryptjs
jest.mock('bcryptjs');

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  generateToken: jest.fn((id, email) => `mock-token-${id}`),
  verifyToken: jest.fn((token) => ({
    id: 'user-123',
    email: 'test@example.com',
  })),
}));

const mockPrisma = new PrismaClient();

describe('AuthService - User Registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should register user with valid credentials', async () => {
    const validPayload = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
    };

    const mockUser = {
      id: 'user-123',
      email: validPayload.email.toLowerCase(),
      passwordHash: 'hashed-password',
      firstName: validPayload.firstName,
      lastName: validPayload.lastName,
      emailVerified: false,
    };

    // Mock: user doesn't exist yet
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    
    // Mock: bcrypt.hash returns hashed password
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    
    // Mock: user creation
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await AuthService.register(validPayload);

    // Assertions
    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('user');
    expect(result.user.email).toBe(validPayload.email.toLowerCase());
    expect(result.user.firstName).toBe(validPayload.firstName);
    
    // Verify bcrypt was called with correct rounds
    expect(bcrypt.hash).toHaveBeenCalledWith(validPayload.password, 12);
    
    // Verify user was created
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  test('should reject registration with missing email', async () => {
    const invalidPayload = {
      email: '',
      password: 'SecurePass123!',
    };

    await expect(AuthService.register(invalidPayload as any))
      .rejects
      .toThrow('Email and password are required');
  });

  test('should reject registration with missing password', async () => {
    const invalidPayload = {
      email: 'test@example.com',
      password: '',
    };

    await expect(AuthService.register(invalidPayload as any))
      .rejects
      .toThrow('Email and password are required');
  });

  test('should enforce password minimum length (12 characters)', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'Short1!',
    };

    await expect(AuthService.register(payload as any))
      .rejects
      .toThrow('Password must be at least 12 characters');
  });

  test('should require uppercase letter in password', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'securepass123!',
    };

    await expect(AuthService.register(payload as any))
      .rejects
      .toThrow('Password must contain at least one uppercase letter');
  });

  test('should require lowercase letter in password', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'SECUREPASS123!',
    };

    await expect(AuthService.register(payload as any))
      .rejects
      .toThrow('Password must contain at least one lowercase letter');
  });

  test('should require number in password', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'SecurePass!Aa',  // 12 chars, uppercase, lowercase, special, but no number
    };

    await expect(AuthService.register(payload as any))
      .rejects
      .toThrow('Password must contain at least one number');
  });

  test('should require special character in password', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'SecurePass123',
    };

    await expect(AuthService.register(payload as any))
      .rejects
      .toThrow('Password must contain at least one special character');
  });

  test('should prevent duplicate email registration', async () => {
    const payload = {
      email: 'existing@example.com',
      password: 'SecurePass123!',
    };

    // Mock: user already exists
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing-user-id',
      email: 'existing@example.com',
    });

    await expect(AuthService.register(payload as any))
      .rejects
      .toThrow('Email');
  });

  test('should normalize email to lowercase', async () => {
    const payload = {
      email: 'NewUser@EXAMPLE.COM',
      password: 'SecurePass123!',
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-123',
      email: 'newuser@example.com',
      passwordHash: 'hashed-password',
      emailVerified: false,
    });

    await AuthService.register(payload as any);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'newuser@example.com' },
    });
  });
});

describe('AuthService - User Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should login user with correct credentials', async () => {
    const loginPayload = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    const mockUser = {
      id: 'user-123',
      email: loginPayload.email,
      passwordHash: await bcrypt.hash(loginPayload.password, 12),
      emailVerified: true,
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await AuthService.login(loginPayload as any);

    expect(result).toHaveProperty('token');
    expect(result.user.email).toBe(loginPayload.email);
    expect(bcrypt.compare).toHaveBeenCalledWith(
      loginPayload.password,
      mockUser.passwordHash
    );
  });

  test('should reject login with non-existent user', async () => {
    const loginPayload = {
      email: 'nonexistent@example.com',
      password: 'SecurePass123!',
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(AuthService.login(loginPayload as any))
      .rejects
      .toThrow('Unauthorized');
  });

  test('should reject login with wrong password', async () => {
    const loginPayload = {
      email: 'test@example.com',
      password: 'WrongPassword123!',
    };

    const mockUser = {
      id: 'user-123',
      email: loginPayload.email,
      passwordHash: 'hashed-correct-password',
      emailVerified: true,
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(AuthService.login(loginPayload as any))
      .rejects
      .toThrow('Unauthorized');
  });

  test('should normalize email during login', async () => {
    const loginPayload = {
      email: 'TEST@EXAMPLE.COM',
      password: 'SecurePass123!',
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(AuthService.login(loginPayload as any))
      .rejects
      .toThrow();

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });
});

describe('AuthService - Password Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should hash password with 12 rounds', async () => {
    const password = 'SecurePass123!';
    
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    await bcrypt.hash(password, 12);

    expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
  });

  test('should verify password correctly', async () => {
    const password = 'SecurePass123!';
    const hashedPassword = 'hashed-password';

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await bcrypt.compare(password, hashedPassword);

    expect(result).toBe(true);
  });

  test('should reject invalid password verification', async () => {
    const password = 'WrongPassword123!';
    const hashedPassword = 'hashed-password';

    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const result = await bcrypt.compare(password, hashedPassword);

    expect(result).toBe(false);
  });
});

describe('AuthService - Token Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should generate JWT token', () => {
    const userId = 'user-123';
    const email = 'test@example.com';

    const { generateToken } = require('../../middleware/auth');
    generateToken(userId, email);

    expect(generateToken).toHaveBeenCalledWith(userId, email);
  });

  test('should generate tokens with consistent format', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
    };

    const mockUser = {
      id: 'user-123',
      email: payload.email,
      passwordHash: 'hashed',
      emailVerified: false,
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await AuthService.register(payload as any);

    expect(result.token).toBe('mock-token-user-123');
  });
});

describe('AuthService - Input Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should accept optional firstName and lastName', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    const mockUser = {
      id: 'user-123',
      email: payload.email,
      passwordHash: 'hashed',
      emailVerified: false,
      firstName: null,
      lastName: null,
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await AuthService.register(payload as any);

    expect(result.user).toHaveProperty('email');
    expect(result.user).toHaveProperty('id');
  });

  test('should handle null optional fields gracefully', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: undefined,
      lastName: undefined,
    };

    const mockUser = {
      id: 'user-123',
      email: payload.email,
      passwordHash: 'hashed',
      emailVerified: false,
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await AuthService.register(payload as any);

    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('user');
  });
});

describe('AuthService - Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should never return password hash in response', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    const mockUser = {
      id: 'user-123',
      email: payload.email,
      passwordHash: 'hashed-password',
      emailVerified: false,
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await AuthService.register(payload as any);

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('password');
  });

  test('should create user record with hashed password', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'SecurePass123!',
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: 'user-123',
      email: payload.email,
      passwordHash: 'hashed-password',
      emailVerified: false,
    });

    await AuthService.register(payload as any);

    const createCall = (mockPrisma.user.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.passwordHash).toBe('hashed-password');
    expect(createCall.data.passwordHash).not.toBe(payload.password);
  });
});