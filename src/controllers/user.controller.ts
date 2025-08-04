import { Request, Response } from 'express';
import UserModel from '../models/user.model';
import KeyModel from '../models/key.model';
import { AuthRequest } from '../types';
import ContactRequestController from './contact-request.controller';

/**
 * User controller for managing user data and contacts
 */
export default class UserController {
  /**
   * Get all users (for contact list)
   * @param req Request
   * @param res Response
   */
  static async getAllUsers(req: AuthRequest, res: Response) {
    try {
      const currentUserId = req.user!.id;
      
      // Get all users
      const users = await UserModel.getAllUsers();
      
      // Filter out the current user
      const filteredUsers = users.filter(user => user.id !== currentUserId);
      
      return res.status(200).json({
        success: true,
        data: { users: filteredUsers },
        message: 'Users retrieved successfully'
      });
    } catch (error) {
      console.error('Get all users error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve users'
      });
    }
  }
  
  /**
   * Get user contacts
   * @param req Request
   * @param res Response
   */
  static async getUserContacts(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      // Get user contacts
      const contacts = await UserModel.getUserContacts(userId);
      
      return res.status(200).json({
        success: true,
        data: { contacts },
        message: 'Contacts retrieved successfully'
      });
    } catch (error) {
      console.error('Get user contacts error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve contacts'
      });
    }
  }
  
  /**
   * Add a contact (now sends a contact request instead of directly adding)
   * @param req Request
   * @param res Response
   */
  static async addContact(req: AuthRequest, res: Response) {
    // Redirect to the sendRequest method in ContactRequestController
    // This maintains backward compatibility with the frontend
    req.body.recipientId = req.body.contactId;
    return ContactRequestController.sendRequest(req, res);
  }
  
  /**
   * Get a user by ID
   * @param req Request
   * @param res Response
   */
  static async getUserById(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      
      // Validate user ID
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user ID'
        });
      }
      
      // Get user
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: { user: UserModel.toDTO(user) },
        message: 'User retrieved successfully'
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      return res.status(500).json({
        success: false,
        error: 'Server error'
      });
    }
  }
  
  /**
   * Search users by username or email
   * @param req Request
   * @param res Response
   */
  static async searchUsers(req: AuthRequest, res: Response) {
    try {
      const { q } = req.query;
      const currentUserId = req.user!.id;
      
      // Validate search query
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }
      
      // Search users
      const users = await UserModel.searchUsers(q, currentUserId);
      
      return res.status(200).json({
        success: true,
        data: { users },
        message: 'Users found successfully'
      });
    } catch (error) {
      console.error('Search users error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to search users'
      });
    }
  }
}
