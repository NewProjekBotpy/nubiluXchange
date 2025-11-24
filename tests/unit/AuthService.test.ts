/**
 * Unit Tests: AuthService
 * Tests for authentication service methods
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../../server/services/AuthService';
import { storage } from '../../server/storage';
import * as authUtils from '../../server/utils/auth';
import { logUserActivity } from '../../server/utils/activity-logger';

// Mock dependencies
vi.mock('../../server/storage');
vi.mock('../../server/utils/auth');
vi.mock('../../server/utils/activity-logger');
vi.mock('../../server/services/TwoFactorService');

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      vi.mocked(storage.getUserByEmail).mockResolvedValue(null);
      vi.mocked(storage.getUserByUsername).mockResolvedValue(null);
      vi.mocked(authUtils.hashPassword).mockResolvedValue('hashed_password');
      vi.mocked(authUtils.generateToken).mockReturnValue('jwt_token');
      vi.mocked(storage.createUser).mockResolvedValue({
        id: 1,
        ...userData,
        password: 'hashed_password',
        role: 'user',
        walletBalance: '0',
        isVerified: false,
        isAdminApproved: false,
        adminRequestPending: false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      const result = await AuthService.register(userData);

      expect(result.message).toBe('User registered successfully');
      expect(result.user).toBeDefined();
      expect(result.user.password).toBeUndefined();
      expect(storage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: userData.username,
          email: userData.email,
          role: 'user',
          walletBalance: '0',
          isVerified: false
        })
      );
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'password123'
      };

      vi.mocked(storage.getUserByEmail).mockResolvedValue({
        id: 1,
        email: 'existing@example.com'
      } as any);

      await expect(AuthService.register(userData)).rejects.toThrow('Email already registered');
    });

    it('should throw error for duplicate username', async () => {
      const userData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'password123'
      };

      vi.mocked(storage.getUserByEmail).mockResolvedValue(null);
      vi.mocked(storage.getUserByUsername).mockResolvedValue({
        id: 1,
        username: 'existinguser'
      } as any);

      await expect(AuthService.register(userData)).rejects.toThrow('Username already taken');
    });

    it('should hash password before storing', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'plaintext_password'
      };

      vi.mocked(storage.getUserByEmail).mockResolvedValue(null);
      vi.mocked(storage.getUserByUsername).mockResolvedValue(null);
      vi.mocked(authUtils.hashPassword).mockResolvedValue('hashed_password');
      vi.mocked(storage.createUser).mockResolvedValue({} as any);
      vi.mocked(authUtils.generateToken).mockReturnValue('token');

      await AuthService.register(userData);

      expect(authUtils.hashPassword).toHaveBeenCalledWith('plaintext_password');
      expect(storage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'hashed_password'
        })
      );
    });

    it('should always set role to user for public registration', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin' // Attempt privilege escalation
      } as any;

      vi.mocked(storage.getUserByEmail).mockResolvedValue(null);
      vi.mocked(storage.getUserByUsername).mockResolvedValue(null);
      vi.mocked(authUtils.hashPassword).mockResolvedValue('hashed_password');
      vi.mocked(storage.createUser).mockResolvedValue({} as any);
      vi.mocked(authUtils.generateToken).mockReturnValue('token');

      await AuthService.register(userData);

      expect(storage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user' // Should override to user
        })
      );
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      const mockUser = {
        id: 1,
        email,
        password: 'hashed_password',
        twoFactorEnabled: false,
        role: 'user'
      };

      vi.mocked(storage.getUserByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(authUtils.comparePassword).mockResolvedValue(true);
      vi.mocked(authUtils.generateToken).mockReturnValue('jwt_token');

      const result = await AuthService.login(email, password);

      expect(result.message).toBe('Login successful');
      expect(result.user).toBeDefined();
      expect(result.user.password).toBeUndefined();
      expect(authUtils.comparePassword).toHaveBeenCalledWith(password, 'hashed_password');
    });

    it('should throw error for non-existent user', async () => {
      vi.mocked(storage.getUserByEmail).mockResolvedValue(null);

      await expect(AuthService.login('wrong@example.com', 'password'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password'
      };

      vi.mocked(storage.getUserByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(authUtils.comparePassword).mockResolvedValue(false);

      await expect(AuthService.login('test@example.com', 'wrong_password'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should log failed login attempts', async () => {
      vi.mocked(storage.getUserByEmail).mockResolvedValue(null);

      await expect(AuthService.login('test@example.com', 'password'))
        .rejects.toThrow();

      expect(logUserActivity).toHaveBeenCalledWith(
        null,
        'auth_failed',
        'user_action',
        expect.objectContaining({
          email: 'test@example.com',
          reason: 'user_not_found'
        }),
        undefined,
        undefined,
        'error'
      );
    });

    it('should require 2FA when enabled', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        twoFactorEnabled: true,
        role: 'user'
      };

      vi.mocked(storage.getUserByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(authUtils.comparePassword).mockResolvedValue(true);

      const result = await AuthService.login('test@example.com', 'password123');

      expect(result.requiresTwoFactor).toBe(true);
      expect(result.userId).toBe(1);
      expect(result.message).toBe('Two-factor authentication required');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user without password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed_password',
        role: 'user'
      };

      vi.mocked(storage.getUser).mockResolvedValue(mockUser as any);

      const result = await AuthService.getCurrentUser(1);

      expect(result.id).toBe(1);
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBeUndefined();
      expect(storage.getUser).toHaveBeenCalledWith(1);
    });

    it('should throw error for non-existent user', async () => {
      vi.mocked(storage.getUser).mockResolvedValue(null);

      await expect(AuthService.getCurrentUser(999))
        .rejects.toThrow('User not found');
    });
  });

  describe('logout', () => {
    it('should destroy session on logout', async () => {
      const userId = 1;
      const destroyMock = vi.fn((callback) => callback());
      const mockReq = {
        session: {
          userId: 1,
          destroy: destroyMock
        }
      } as any;

      const mockRes = {
        clearCookie: vi.fn()
      } as any;

      await AuthService.logout(userId, mockReq, mockRes);

      expect(destroyMock).toHaveBeenCalled();
      expect(mockRes.clearCookie).toHaveBeenCalledWith('auth_token', expect.any(Object));
    });

    it('should log logout activity', async () => {
      const userId = 1;
      const destroyMock = vi.fn((callback) => callback());
      const mockReq = {
        session: {
          userId: 1,
          destroy: destroyMock
        }
      } as any;

      const mockRes = {
        clearCookie: vi.fn()
      } as any;

      await AuthService.logout(userId, mockReq, mockRes);

      expect(logUserActivity).toHaveBeenCalledWith(
        userId,
        'logout',
        'user_action',
        expect.any(Object),
        undefined,
        mockReq
      );
    });
  });
});
