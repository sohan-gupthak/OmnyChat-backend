import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthRequest } from '../types';

/**
 * Authentication middleware to protect routes
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  // Get token from header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  // Extract token
  const token = authHeader.split(' ')[1];
  
  // Verify token
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  
  // Add user info to request
  req.user = {
    id: payload.userId,
    email: payload.email,
    username: '' // Will be populated from database in user routes if needed
  };
  
  next();
}
