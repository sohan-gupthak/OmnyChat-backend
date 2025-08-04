import { Request, Response } from 'express';
import UserModel from '../models/user.model';
import { comparePassword } from '../utils/crypto';
import { generateToken } from '../utils/jwt';
import { LoginCredentials, RegisterData } from '../types';

/**
 * Authentication controller
 */
export default class AuthController {
  /**
   * Register a new user
   * @param req Request
   * @param res Response
   */
  static async register(req: Request, res: Response) {
    try {
      const userData: RegisterData = req.body;
      
      // Validate input
      if (!userData.username || !userData.email || !userData.password) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
      }
      
      // Check if email already exists
      const existingUser = await UserModel.findByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ success: false, error: 'Email already in use' });
      }
      
      // Create user
      const user = await UserModel.create(userData);
      
      // Generate token
      const token = generateToken({
        userId: user.id,
        email: user.email
      });
      
      // Return user data and token
      return res.status(201).json({
        success: true,
        data: {
          user: UserModel.toDTO(user),
          token
        },
        message: 'User registered successfully'
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
  
  /**
   * Login a user
   * @param req Request
   * @param res Response
   */
  static async login(req: Request, res: Response) {
    try {
      const credentials: LoginCredentials = req.body;
      
      // Validate input
      if (!credentials.email || !credentials.password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
      }
      
      // Find user by email
      const user = await UserModel.findByEmail(credentials.email);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      
      // Check password
      const isPasswordValid = await comparePassword(credentials.password, user.password!);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      
      // Generate token
      const token = generateToken({
        userId: user.id,
        email: user.email
      });
      
      // Return user data and token
      return res.status(200).json({
        success: true,
        data: {
          user: UserModel.toDTO(user),
          token
        },
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
  
  /**
   * Get current user profile
   * @param req Request
   * @param res Response
   */
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      
      // Find user by ID
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      // Return user data
      return res.status(200).json({
        success: true,
        data: UserModel.toDTO(user),
        message: 'Profile retrieved successfully'
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ success: false, error: 'Server error' });
    }
  }
}
