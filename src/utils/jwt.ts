import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { TokenPayload } from '../types';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_replace_in_production';
const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION || '86400'); // 24 hours in seconds

/**
 * Generate a JWT token for a user
 * @param payload The data to include in the token
 * @returns The JWT token
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION
  });
}

/**
 * Verify a JWT token
 * @param token The token to verify
 * @returns The decoded token payload or null if invalid
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}
