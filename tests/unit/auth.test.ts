/**
 * Unit Tests: Auth Utilities
 * Tests for authentication utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { hashPassword, comparePassword, generateToken, verifyToken, JWT_SECRET } from '../../server/utils/auth';

// Mock bcrypt and jwt
vi.mock('bcryptjs');
vi.mock('jsonwebtoken');

describe('Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'testPassword123';
      const hashedPassword = 'hashed_password_value';
      
      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as any);

      const result = await hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should use salt rounds of 12', async () => {
      const password = 'password';
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as any);

      await hashPassword(password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
    });

    it('should handle different password lengths', async () => {
      const passwords = ['short', 'medium_length_password', 'very_long_password_with_many_characters_12345678'];
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as any);

      for (const password of passwords) {
        await hashPassword(password);
        expect(bcrypt.hash).toHaveBeenCalledWith(password, 12);
      }
    });

    it('should throw error if bcrypt fails', async () => {
      const password = 'testPassword';
      const error = new Error('Bcrypt error');
      
      vi.mocked(bcrypt.hash).mockRejectedValue(error);

      await expect(hashPassword(password)).rejects.toThrow('Bcrypt error');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'testPassword123';
      const hash = 'hashed_password';
      
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

      const result = await comparePassword(password, hash);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it('should return false for non-matching password and hash', async () => {
      const password = 'wrongPassword';
      const hash = 'hashed_password';
      
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any);

      const result = await comparePassword(password, hash);

      expect(result).toBe(false);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it('should handle special characters in password', async () => {
      const password = 'p@$$w0rd!#$%^&*()';
      const hash = 'hashed_password';
      
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);

      await comparePassword(password, hash);

      expect(bcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it('should throw error if bcrypt compare fails', async () => {
      const password = 'testPassword';
      const hash = 'hashed_password';
      const error = new Error('Comparison error');
      
      vi.mocked(bcrypt.compare).mockRejectedValue(error);

      await expect(comparePassword(password, hash)).rejects.toThrow('Comparison error');
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token with user id and role', () => {
      const user = { id: 1, role: 'user' };
      const token = 'jwt_token_value';
      
      vi.mocked(jwt.sign).mockReturnValue(token as any);

      const result = generateToken(user);

      expect(result).toBe(token);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
    });

    it('should set token expiry to 7 days', () => {
      const user = { id: 1, role: 'admin' };
      vi.mocked(jwt.sign).mockReturnValue('token' as any);

      generateToken(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        { expiresIn: '7d' }
      );
    });

    it('should include admin role in token', () => {
      const user = { id: 2, role: 'admin' };
      vi.mocked(jwt.sign).mockReturnValue('admin_token' as any);

      generateToken(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 2, role: 'admin' },
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should include owner role in token', () => {
      const user = { id: 3, role: 'owner' };
      vi.mocked(jwt.sign).mockReturnValue('owner_token' as any);

      generateToken(user);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 3, role: 'owner' },
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('verifyToken', () => {
    it('should return decoded token for valid token', () => {
      const token = 'valid_jwt_token';
      const decoded = { id: 1, role: 'user', iat: 123456, exp: 789012 };
      
      vi.mocked(jwt.verify).mockReturnValue(decoded as any);

      const result = verifyToken(token);

      expect(result).toEqual(decoded);
      expect(jwt.verify).toHaveBeenCalledWith(token, JWT_SECRET);
    });

    it('should return null for invalid token', () => {
      const token = 'invalid_token';
      
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = verifyToken(token);

      expect(result).toBeNull();
    });

    it('should return null for expired token', () => {
      const token = 'expired_token';
      
      vi.mocked(jwt.verify).mockImplementation(() => {
        const error: any = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const result = verifyToken(token);

      expect(result).toBeNull();
    });

    it('should return null for malformed token', () => {
      const token = 'malformed.token';
      
      vi.mocked(jwt.verify).mockImplementation(() => {
        const error: any = new Error('Malformed token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      const result = verifyToken(token);

      expect(result).toBeNull();
    });

    it('should handle empty token', () => {
      const token = '';
      
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Empty token');
      });

      const result = verifyToken(token);

      expect(result).toBeNull();
    });
  });

  describe('JWT_SECRET', () => {
    it('should be defined', () => {
      expect(JWT_SECRET).toBeDefined();
      expect(typeof JWT_SECRET).toBe('string');
    });
  });
});
