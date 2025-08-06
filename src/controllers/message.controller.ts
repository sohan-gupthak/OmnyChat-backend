import { Response } from 'express';
import { AuthRequest } from '../types';
import MessageModel from '../models/message.model';

/**
 * Controller for handling messages
 */
export default class MessageController {
  /**
   * Get offline messages for a user
   * @param req Request
   * @param res Response
   */
  static async getOfflineMessages(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      // Get undelivered messages
      const messages = await MessageModel.getUndeliveredMessages(userId);
      
      // Mark messages as delivered
      if (messages.length > 0) {
        await MessageModel.markAsDelivered(messages.map(msg => msg.id));
      }
      
      return res.status(200).json({
        success: true,
        data: {
          messages: messages.map(msg => ({
            id: msg.id,
            sender: msg.sender_id,
            content: msg.encrypted_content,
            timestamp: msg.created_at
          }))
        },
        message: 'Offline messages retrieved successfully'
      });
    } catch (error) {
      console.error('Get offline messages error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve offline messages' 
      });
    }
  }
  
  /**
   * Mark messages as read
   * @param req Request
   * @param res Response
   */
  static async markMessagesAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { messageIds } = req.body;
      
      if (!messageIds || !Array.isArray(messageIds)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Message IDs are required' 
        });
      }
      
      // Mark messages as read
      await MessageModel.markAsRead(messageIds, userId);
      
      return res.status(200).json({
        success: true,
        message: 'Messages marked as read'
      });
    } catch (error) {
      console.error('Mark messages as read error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to mark messages as read' 
      });
    }
  }
  
  /**
   * Store a message for offline delivery
   * @param req Request
   * @param res Response
   */
  static async storeMessage(req: AuthRequest, res: Response) {
    try {
      const senderId = req.user!.id;
      const { recipientId, content, timestamp } = req.body;
      
      if (!recipientId || !content) {
        return res.status(400).json({ 
          success: false, 
          error: 'Recipient ID and content are required' 
        });
      }
      
      // Store the message
      const message = await MessageModel.storeMessage(
        senderId,
        recipientId,
        content
      );
      
      return res.status(200).json({
        success: true,
        data: { id: message.id },
        message: 'Message stored successfully'
      });
    } catch (error) {
      console.error('Store message error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to store message' 
      });
    }
  }
  
  /**
   * Store a received P2P message
   * @param req Request
   * @param res Response
   */
  static async storeReceivedMessage(req: AuthRequest, res: Response) {
    try {
      const recipientId = req.user!.id;
      const { senderId, content, timestamp } = req.body;
      
      if (!senderId || !content) {
        return res.status(400).json({ 
          success: false, 
          error: 'Sender ID and content are required' 
        });
      }
      
      // Store the message
      const message = await MessageModel.storeMessage(
        senderId,
        recipientId,
        content
      );
      
      // Mark as delivered since it was received via P2P
      await MessageModel.markAsDelivered([message.id]);
      
      return res.status(200).json({
        success: true,
        data: { id: message.id },
        message: 'P2P message stored successfully'
      });
    } catch (error) {
      console.error('Store received P2P message error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to store received P2P message' 
      });
    }
  }
}
