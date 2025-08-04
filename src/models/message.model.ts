import pool from '../config/database';
import { Message } from '../types';

/**
 * Message model for database operations
 */
export default class MessageModel {
  /**
   * Store an offline message
   * @param senderId Sender user ID
   * @param recipientId Recipient user ID
   * @param encryptedContent Encrypted message content
   * @returns The stored message
   */
  static async storeMessage(
    senderId: number,
    recipientId: number,
    encryptedContent: string
  ): Promise<Message> {
    const query = `
      INSERT INTO messages (sender_id, recipient_id, encrypted_content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(query, [senderId, recipientId, encryptedContent]);
    return result.rows[0];
  }
  
  /**
   * Get undelivered messages for a user
   * @param userId User ID
   * @returns Array of undelivered messages
   */
  static async getUndeliveredMessages(userId: number): Promise<Message[]> {
    const query = `
      SELECT * FROM messages
      WHERE recipient_id = $1 AND is_delivered = false
      ORDER BY created_at ASC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
  
  /**
   * Mark messages as delivered
   * @param messageIds Array of message IDs
   * @returns Number of messages marked as delivered
   */
  static async markAsDelivered(messageIds: number[]): Promise<number> {
    if (messageIds.length === 0) {
      return 0;
    }
    
    const placeholders = messageIds.map((_, idx) => `$${idx + 1}`).join(', ');
    
    const query = `
      UPDATE messages
      SET is_delivered = true, delivered_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `;
    
    const result = await pool.query(query, messageIds);
    return result.rowCount || 0;
  }
  
  /**
   * Mark messages as read
   * @param messageIds Array of message IDs
   * @param userId User ID of the recipient
   * @returns Number of messages marked as read
   */
  static async markAsRead(messageIds: number[], userId: number): Promise<number> {
    if (messageIds.length === 0) {
      return 0;
    }
    
    const placeholders = messageIds.map((_, idx) => `$${idx + 1}`).join(', ');
    const userIdParam = `$${messageIds.length + 1}`;
    
    const query = `
      UPDATE messages
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
      AND recipient_id = ${userIdParam}
    `;
    
    const result = await pool.query(query, [...messageIds, userId]);
    return result.rowCount || 0;
  }

  /**
   * Delete delivered messages older than a certain time
   * @param days Number of days to keep delivered messages
   * @returns Number of messages deleted
   */
  static async cleanupOldMessages(days: number = 7): Promise<number> {
    const query = `
      DELETE FROM messages
      WHERE is_delivered = true
      AND delivered_at < NOW() - INTERVAL '${days} days'
    `;
    
    const result = await pool.query(query);
    return result.rowCount || 0;
  }
}
