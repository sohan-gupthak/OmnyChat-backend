import pool from '../config/database';
import { User, UserDTO, RegisterData } from '../types';
import { hashPassword } from '../utils/crypto';

/**
 * User model for database operations
 */
export default class UserModel {
  /**
   * Create a new user
   * @param userData User registration data
   * @returns The created user
   */
  static async create(userData: RegisterData): Promise<User> {
    const { username, email, password } = userData;
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Insert the user into the database
    const query = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, created_at, updated_at
    `;
    
    const result = await pool.query(query, [username, email, hashedPassword]);
    return result.rows[0];
  }
  
  /**
   * Find a user by email
   * @param email User email
   * @returns The user or null if not found
   */
  static async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, username, email, password, created_at, updated_at
      FROM users
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }
  
  /**
   * Find a user by ID
   * @param id User ID
   * @returns The user or null if not found
   */
  static async findById(id: number): Promise<User | null> {
    const query = `
      SELECT id, username, email, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
  
  /**
   * Convert a User to a UserDTO (remove sensitive data)
   * @param user User object
   * @returns UserDTO
   */
  static toDTO(user: User): UserDTO {
    const { id, username, email } = user;
    return { id, username, email };
  }
  
  /**
   * Get all users (for contact list)
   * @returns Array of UserDTO objects
   */
  static async getAllUsers(): Promise<UserDTO[]> {
    const query = `
      SELECT id, username, email
      FROM users
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }
  
  /**
   * Get user contacts
   * @param userId User ID
   * @returns Array of UserDTO objects
   */
  static async getUserContacts(userId: number): Promise<UserDTO[]> {
    const query = `
      SELECT u.id, u.username, u.email, c.contact_id as contactId
      FROM users u
      JOIN contacts c ON u.id = c.contact_id
      WHERE c.user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
  
  /**
   * Add a contact
   * @param userId User ID
   * @param contactId Contact ID
   * @returns True if successful
   */
  static async addContact(userId: number, contactId: number): Promise<boolean> {
    // Check if contact already exists
    const checkQuery = `
      SELECT id FROM contacts
      WHERE user_id = $1 AND contact_id = $2
    `;
    
    const checkResult = await pool.query(checkQuery, [userId, contactId]);
    
    if (checkResult.rowCount && checkResult.rowCount > 0) {
      return true; // Contact already exists
    }
    
    // Add the contact
    const query = `
      INSERT INTO contacts (user_id, contact_id)
      VALUES ($1, $2)
    `;
    
    await pool.query(query, [userId, contactId]);
    return true;
  }
  
  /**
   * Search users by username or email
   * @param query Search query
   * @param currentUserId ID of the current user (to exclude from results)
   * @returns Array of UserDTO objects matching the search criteria
   */
  static async searchUsers(query: string, currentUserId: number): Promise<UserDTO[]> {
    const searchQuery = `
      SELECT id, username, email
      FROM users
      WHERE (username ILIKE $1 OR email ILIKE $1) AND id != $2
    `;
    
    const result = await pool.query(searchQuery, [`%${query}%`, currentUserId]);
    return result.rows;
  }
}
