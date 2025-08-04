import { Response } from 'express';
import ContactRequestModel from '../models/contact-request.model';
import UserModel from '../models/user.model';
import KeyModel from '../models/key.model';
import { AuthRequest } from '../types';

/**
 * Contact request controller for managing contact requests
 */
export default class ContactRequestController {
  /**
   * Send a contact request
   * @param req Request
   * @param res Response
   */
  static async sendRequest(req: AuthRequest, res: Response) {
    try {
      const senderId = req.user!.id;
      const { recipientId } = req.body;
      
      // Validate recipient ID
      if (!recipientId || isNaN(parseInt(recipientId.toString()))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid recipient ID'
        });
      }
      
      const recipientIdNum = parseInt(recipientId.toString());
      
      // Check if recipient exists
      const recipient = await UserModel.findById(recipientIdNum);
      if (!recipient) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      // Check if recipient is the current user
      if (recipientIdNum === senderId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot send a contact request to yourself'
        });
      }
      
      // Check if recipient has required keys
      const hasKeys = await KeyModel.hasRequiredKeys(recipientIdNum);
      if (!hasKeys) {
        return res.status(400).json({
          success: false,
          error: 'Recipient does not have required keys'
        });
      }
      
      // Check if they are already contacts
      const contacts = await UserModel.getUserContacts(senderId);
      const isAlreadyContact = contacts.some(contact => contact.id === recipientIdNum);
      
      if (isAlreadyContact) {
        return res.status(400).json({
          success: false,
          error: 'User is already in your contacts'
        });
      }
      
      // Send contact request
      const request = await ContactRequestModel.create(senderId, recipientIdNum);
      
      return res.status(200).json({
        success: true,
        data: { request },
        message: 'Contact request sent successfully'
      });
    } catch (error) {
      console.error('Send contact request error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to send contact request'
      });
    }
  }

  /**
   * Get pending contact requests for the current user
   * @param req Request
   * @param res Response
   */
  static async getPendingRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      // Get pending requests
      const requests = await ContactRequestModel.getPendingRequests(userId);
      
      return res.status(200).json({
        success: true,
        data: { requests },
        message: 'Pending contact requests retrieved successfully'
      });
    } catch (error) {
      console.error('Get pending contact requests error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve pending contact requests'
      });
    }
  }

  /**
   * Get sent contact requests by the current user
   * @param req Request
   * @param res Response
   */
  static async getSentRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      // Get sent requests
      const requests = await ContactRequestModel.getSentRequests(userId);
      
      return res.status(200).json({
        success: true,
        data: { requests },
        message: 'Sent contact requests retrieved successfully'
      });
    } catch (error) {
      console.error('Get sent contact requests error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve sent contact requests'
      });
    }
  }

  /**
   * Accept a contact request
   * @param req Request
   * @param res Response
   */
  static async acceptRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { requestId } = req.params;
      
      // Validate request ID
      if (!requestId || isNaN(parseInt(requestId))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request ID'
        });
      }
      
      const requestIdNum = parseInt(requestId);
      
      // Accept request
      const success = await ContactRequestModel.acceptRequest(requestIdNum, userId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Contact request not found or you are not the recipient'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Contact request accepted successfully'
      });
    } catch (error) {
      console.error('Accept contact request error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to accept contact request'
      });
    }
  }

  /**
   * Reject a contact request
   * @param req Request
   * @param res Response
   */
  static async rejectRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { requestId } = req.params;
      
      // Validate request ID
      if (!requestId || isNaN(parseInt(requestId))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request ID'
        });
      }
      
      const requestIdNum = parseInt(requestId);
      
      // Reject request
      const success = await ContactRequestModel.rejectRequest(requestIdNum, userId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Contact request not found or you are not the recipient'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Contact request rejected successfully'
      });
    } catch (error) {
      console.error('Reject contact request error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reject contact request'
      });
    }
  }

  /**
   * Cancel a contact request
   * @param req Request
   * @param res Response
   */
  static async cancelRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { requestId } = req.params;
      
      // Validate request ID
      if (!requestId || isNaN(parseInt(requestId))) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request ID'
        });
      }
      
      const requestIdNum = parseInt(requestId);
      
      // Cancel request
      const success = await ContactRequestModel.cancelRequest(requestIdNum, userId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Contact request not found or you are not the sender'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Contact request canceled successfully'
      });
    } catch (error) {
      console.error('Cancel contact request error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to cancel contact request'
      });
    }
  }
}
