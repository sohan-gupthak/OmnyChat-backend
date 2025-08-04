import pool from '../config/database';
import { ContactRequest, ContactRequestDTO } from '../types';
import UserModel from './user.model';

/**
 * Contact request model for database operations
 */
export default class ContactRequestModel {
  /**
   * Create a new contact request
   * @param senderId Sender user ID
   * @param recipientId Recipient user ID
   * @returns The created contact request
   */
  static async create(senderId: number, recipientId: number): Promise<ContactRequest> {
    // Check if a request already exists
    const existingRequest = await this.findBySenderAndRecipient(senderId, recipientId);
    if (existingRequest) {
      // If the request was rejected, we can update it back to pending
      if (existingRequest.status === 'rejected') {
        const updateQuery = `
          UPDATE contact_requests
          SET status = 'pending', updated_at = CURRENT_TIMESTAMP
          WHERE sender_id = $1 AND recipient_id = $2
          RETURNING id, sender_id, recipient_id, status, created_at, updated_at
        `;
        const result = await pool.query(updateQuery, [senderId, recipientId]);
        return result.rows[0];
      }
      return existingRequest;
    }

    // Insert the contact request into the database
    const query = `
      INSERT INTO contact_requests (sender_id, recipient_id)
      VALUES ($1, $2)
      RETURNING id, sender_id, recipient_id, status, created_at, updated_at
    `;
    
    const result = await pool.query(query, [senderId, recipientId]);
    return result.rows[0];
  }

  /**
   * Find a contact request by sender and recipient
   * @param senderId Sender user ID
   * @param recipientId Recipient user ID
   * @returns The contact request or null if not found
   */
  static async findBySenderAndRecipient(
    senderId: number, 
    recipientId: number
  ): Promise<ContactRequest | null> {
    const query = `
      SELECT id, sender_id, recipient_id, status, created_at, updated_at
      FROM contact_requests
      WHERE sender_id = $1 AND recipient_id = $2
    `;
    
    const result = await pool.query(query, [senderId, recipientId]);
    return result.rows[0] || null;
  }

  /**
   * Find a contact request by ID
   * @param id Contact request ID
   * @returns The contact request or null if not found
   */
  static async findById(id: number): Promise<ContactRequest | null> {
    const query = `
      SELECT id, sender_id, recipient_id, status, created_at, updated_at
      FROM contact_requests
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get pending contact requests for a user
   * @param userId User ID
   * @returns Array of pending contact requests
   */
  static async getPendingRequests(userId: number): Promise<ContactRequestDTO[]> {
    const query = `
      SELECT cr.id, cr.sender_id, cr.recipient_id, cr.status, cr.created_at, cr.updated_at,
             u.username as sender_username, u.email as sender_email
      FROM contact_requests cr
      JOIN users u ON cr.sender_id = u.id
      WHERE cr.recipient_id = $1 AND cr.status = 'pending'
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows.map(row => ({
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      sender: {
        id: row.sender_id,
        username: row.sender_username,
        email: row.sender_email
      }
    }));
  }

  /**
   * Get sent contact requests by a user
   * @param userId User ID
   * @returns Array of sent contact requests
   */
  static async getSentRequests(userId: number): Promise<ContactRequestDTO[]> {
    const query = `
      SELECT cr.id, cr.sender_id, cr.recipient_id, cr.status, cr.created_at, cr.updated_at,
             u.username as recipient_username, u.email as recipient_email
      FROM contact_requests cr
      JOIN users u ON cr.recipient_id = u.id
      WHERE cr.sender_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows.map(row => ({
      id: row.id,
      sender_id: row.sender_id,
      recipient_id: row.recipient_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      recipient: {
        id: row.recipient_id,
        username: row.recipient_username,
        email: row.recipient_email
      }
    }));
  }

  /**
   * Accept a contact request
   * @param requestId Contact request ID
   * @param userId User ID (recipient) accepting the request
   * @returns True if successful
   */
  static async acceptRequest(requestId: number, userId: number): Promise<boolean> {
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get the request
      const requestQuery = `
        SELECT id, sender_id, recipient_id, status
        FROM contact_requests
        WHERE id = $1 AND recipient_id = $2
      `;
      
      const requestResult = await client.query(requestQuery, [requestId, userId]);
      if (!requestResult.rowCount || requestResult.rowCount === 0) {
        throw new Error('Contact request not found or you are not the recipient');
      }
      
      const request = requestResult.rows[0];
      
      // Update the request status
      const updateQuery = `
        UPDATE contact_requests
        SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      
      await client.query(updateQuery, [requestId]);
      
      // Add contacts for both users (bidirectional)
      const addContact1Query = `
        INSERT INTO contacts (user_id, contact_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, contact_id) DO NOTHING
      `;
      
      const addContact2Query = `
        INSERT INTO contacts (user_id, contact_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, contact_id) DO NOTHING
      `;
      
      await client.query(addContact1Query, [request.recipient_id, request.sender_id]);
      await client.query(addContact2Query, [request.sender_id, request.recipient_id]);
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error accepting contact request:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject a contact request
   * @param requestId Contact request ID
   * @param userId User ID (recipient) rejecting the request
   * @returns True if successful
   */
  static async rejectRequest(requestId: number, userId: number): Promise<boolean> {
    const query = `
      UPDATE contact_requests
      SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND recipient_id = $2
      RETURNING id
    `;
    
    const result = await pool.query(query, [requestId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Cancel a contact request
   * @param requestId Contact request ID
   * @param userId User ID (sender) canceling the request
   * @returns True if successful
   */
  static async cancelRequest(requestId: number, userId: number): Promise<boolean> {
    const query = `
      DELETE FROM contact_requests
      WHERE id = $1 AND sender_id = $2
      RETURNING id
    `;
    
    const result = await pool.query(query, [requestId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }
}
