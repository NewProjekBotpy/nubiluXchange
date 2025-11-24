import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logError } from "./logger";

// JWT Secret (REQUIRED for all environments)
export const JWT_SECRET = process.env.JWT_SECRET || (() => {
  logError(new Error('JWT_SECRET not configured'), 'FATAL: JWT_SECRET environment variable is required');
  logError(new Error('JWT_SECRET setup'), 'Generate a secure secret with: openssl rand -hex 32');
  logError(new Error('JWT_SECRET setup'), 'Add it to your .env file: JWT_SECRET="your-secret-here"');
  process.exit(1);
  throw new Error('JWT_SECRET not configured');
})();

// Authentication utilities
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export const generateToken = (user: { id: number; role: string }): string => {
  return jwt.sign(
    { 
      id: user.id, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};