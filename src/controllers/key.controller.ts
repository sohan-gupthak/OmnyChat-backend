import { Request, Response } from 'express';
import KeyModel from '../models/key.model';
import { AuthRequest, KeyPublishData } from '../types';
import { verifySignature } from '../utils/crypto';

/**
 * Key controller for managing cryptographic keys
 */
export default class KeyController {
  /**
   * Publish a user's public key
   * @param req Request
   * @param res Response
   */
  static async publishKey(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const keyData: KeyPublishData = req.body;
      
      // Validate input
      if (!keyData.public_key || !keyData.key_type) {
        return res.status(400).json({ 
          success: false, 
          error: 'Public key and key type are required' 
        });
      }
      
      // Validate key type
      if (keyData.key_type !== 'ecdh' && keyData.key_type !== 'ed25519') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid key type' 
        });
      }
      
      // Store the key
      const key = await KeyModel.storeKey(userId, keyData.public_key, keyData.key_type);
      
      return res.status(200).json({
        success: true,
        data: {
          id: key.id,
          publicKey: key.public_key,
          signedKey: key.signed_key,
          keyType: key.key_type
        },
        message: 'Key published successfully'
      });
    } catch (error) {
      console.error('Publish key error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Server error' 
      });
    }
  }
  
  /**
   * Get a user's public key
   * @param req Request
   * @param res Response
   */
  static async getKey(req: Request, res: Response) {
    try {
      const userId = parseInt(req.params.userId);
      const keyType = req.query.type as string;
      
      // Validate key type
      if (keyType !== 'ecdh' && keyType !== 'ed25519') {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid key type' 
        });
      }
      
      // Get the key
      const key = await KeyModel.getKey(userId, keyType);
      
      if (!key) {
        return res.status(404).json({ 
          success: false, 
          error: 'Key not found' 
        });
      }
      
      return res.status(200).json({
        success: true,
        data: {
          publicKey: key.public_key,
          signedKey: key.signed_key,
          keyType: key.key_type
        },
        message: 'Key retrieved successfully'
      });
    } catch (error) {
      console.error('Get key error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Server error' 
      });
    }
  }
  
  /**
   * Verify a signed key
   * @param req Request
   * @param res Response
   */
  static async verifyKey(req: Request, res: Response) {
    try {
      const { public_key, signed_key } = req.body;
      
      // Validate input
      if (!public_key || !signed_key) {
        return res.status(400).json({ 
          success: false, 
          error: 'Public key and signed key are required' 
        });
      }
      
      // Verify the signature
      const isValid = verifySignature(public_key, signed_key);
      
      return res.status(200).json({
        success: true,
        data: { valid: isValid },
        message: 'Key verification completed'
      });
    } catch (error) {
      console.error('Verify key error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Server error' 
      });
    }
  }
  
  /**
   * Get the server's public key
   * @param req Request
   * @param res Response
   */
  static async getServerPublicKey(req: Request, res: Response) {
    try {
      const serverPublicKey = process.env.SERVER_PUBLIC_KEY;
      
      if (!serverPublicKey) {
        return res.status(500).json({ 
          success: false, 
          error: 'Server public key not available' 
        });
      }
      
      return res.status(200).json({
        success: true,
        data: { publicKey: serverPublicKey },
        message: 'Server public key retrieved successfully'
      });
    } catch (error) {
      console.error('Get server public key error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Server error' 
      });
    }
  }
}
