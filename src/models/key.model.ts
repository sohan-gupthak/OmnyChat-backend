import pool from '../config/database';
import { UserKey, KeyType } from '../types';
import { signPublicKey } from '../utils/crypto';

/**
 * Key model for database operations
 */
export default class KeyModel {
  /**
   * Store a user's public key
   * @param userId User ID
   * @param publicKey Public key string
   * @param keyType Type of key (ecdh or ed25519)
   * @returns The stored key
   */
  static async storeKey(userId: number, publicKey: string, keyType: KeyType): Promise<UserKey> {
    // Sign the public key with the server's private key
    const signedKey = signPublicKey(publicKey);
    
    // Check if key already exists for this user and type
    const checkQuery = `
      SELECT * FROM user_keys
      WHERE user_id = $1 AND key_type = $2
    `;
    
    const checkResult = await pool.query(checkQuery, [userId, keyType]);
    
    if (checkResult.rowCount && checkResult.rowCount > 0) {
      // Update existing key
      const updateQuery = `
        UPDATE user_keys
        SET public_key = $1, signed_key = $2, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $3 AND key_type = $4
        RETURNING *
      `;
      
      const result = await pool.query(updateQuery, [publicKey, signedKey, userId, keyType]);
      return result.rows[0];
    } else {
      // Insert new key
      const insertQuery = `
        INSERT INTO user_keys (user_id, public_key, signed_key, key_type)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const result = await pool.query(insertQuery, [userId, publicKey, signedKey, keyType]);
      return result.rows[0];
    }
  }
  
  /**
   * Get a user's key by type
   * @param userId User ID
   * @param keyType Type of key
   * @returns The key or null if not found
   */
  static async getKey(userId: number, keyType: KeyType): Promise<UserKey | null> {
    const query = `
      SELECT * FROM user_keys
      WHERE user_id = $1 AND key_type = $2
    `;
    
    const result = await pool.query(query, [userId, keyType]);
    return result.rows[0] || null;
  }
  
  /**
   * Get all keys for a user
   * @param userId User ID
   * @returns Array of keys
   */
  static async getUserKeys(userId: number): Promise<UserKey[]> {
    const query = `
      SELECT * FROM user_keys
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
  
  /**
   * Verify if a user has both required key types
   * @param userId User ID
   * @returns True if user has both key types
   */
  static async hasRequiredKeys(userId: number): Promise<boolean> {
    const query = `
      SELECT key_type FROM user_keys
      WHERE user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (!result.rowCount || result.rowCount < 2) {
      return false;
    }
    
    const keyTypes = result.rows.map(row => row.key_type);
    return keyTypes.includes('ecdh') && keyTypes.includes('ed25519');
  }
}
