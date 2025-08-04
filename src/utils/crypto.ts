import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import nacl from 'tweetnacl';
import sodium from 'libsodium-wrappers';
import { KeyType } from '../types';

dotenv.config();

// Wait for sodium to be ready
let sodiumReady = false;
sodium.ready.then(() => {
  sodiumReady = true;
  console.log('Libsodium initialized');
});

/**
 * Generate a new Ed25519 key pair for the server
 */
export function generateServerKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return { privateKey, publicKey };
}

/**
 * Sign a public key using the server's private key
 * @param publicKeyToSign The public key to sign
 * @returns The signature as a base64 string
 */
export function signPublicKey(publicKeyToSign: string): string {
  try {
    const privateKey = process.env.SERVER_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('Server private key not found');
    }

    // Create a sign object with SHA256
    const sign = crypto.createSign('SHA256');
    sign.write(publicKeyToSign);
    sign.end();
    
    // Sign the data
    const signature = sign.sign(privateKey);
    return signature.toString('base64');
  } catch (error: any) {
    console.error('Error signing public key:', error);
    throw new Error(`Failed to sign public key: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Verify a signature using the server's public key
 * @param data The original data that was signed
 * @param signature The signature to verify (base64 string)
 * @returns True if the signature is valid
 */
export function verifySignature(data: string, signature: string): boolean {
  try {
    const publicKey = process.env.SERVER_PUBLIC_KEY;
    
    if (!publicKey) {
      throw new Error('Server public key not found');
    }

    // Create a verify object with SHA256
    const verify = crypto.createVerify('SHA256');
    verify.write(data);
    verify.end();
    
    // Verify the signature
    return verify.verify(publicKey, Buffer.from(signature, 'base64'));
  } catch (error: any) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Initialize server keys if they don't exist
 */
export function initializeServerKeys(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  
  // Check if keys already exist in .env and are not empty
  if (process.env.SERVER_PRIVATE_KEY && process.env.SERVER_PUBLIC_KEY && 
      process.env.SERVER_PRIVATE_KEY.trim() !== '' && process.env.SERVER_PUBLIC_KEY.trim() !== '') {
    console.log('Server keys already exist');
    return;
  }

  try {
    // Generate new key pair using Node.js native crypto
    console.log('Generating new server key pair...');
    
    // Use RSA instead of Ed25519 for better compatibility
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    const { privateKey, publicKey } = keyPair;
    
    // Read current .env content
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Prepare key strings for .env file (replace newlines with actual newlines in the file)
    const privateKeyForEnv = privateKey.replace(/\n/g, '\\n');
    const publicKeyForEnv = publicKey.replace(/\n/g, '\\n');

    // Replace placeholders with actual keys
    envContent = envContent.replace(/SERVER_PRIVATE_KEY=.*/, `SERVER_PRIVATE_KEY=${privateKeyForEnv}`);
    envContent = envContent.replace(/SERVER_PUBLIC_KEY=.*/, `SERVER_PUBLIC_KEY=${publicKeyForEnv}`);

    // Write updated .env file
    fs.writeFileSync(envPath, envContent);
    
    // Update environment variables in current process
    process.env.SERVER_PRIVATE_KEY = privateKey;
    process.env.SERVER_PUBLIC_KEY = publicKey;
    
    console.log('Server keys generated and saved to .env file');
  } catch (error: any) {
    console.error('Error generating server keys:', error.message);
    throw new Error(`Failed to initialize server keys: ${error.message}`);
  }
}

/**
 * Hash a password using bcrypt
 * @param password The password to hash
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcrypt');
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare a password with a hash
 * @param password The password to check
 * @param hash The hash to compare against
 * @returns True if the password matches the hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = require('bcrypt');
  return await bcrypt.compare(password, hash);
}

/**
 * Generate a key pair for ECDH key exchange
 * @returns Object containing base64 encoded public and private keys
 */
export function generateECDHKeyPair(): { publicKey: string; privateKey: string } {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
    privateKey: Buffer.from(keyPair.secretKey).toString('base64')
  };
}

/**
 * Generate a key pair for Ed25519 signatures
 * @returns Object containing base64 encoded public and private keys
 */
export function generateEd25519KeyPair(): { publicKey: string; privateKey: string } {
  const keyPair = nacl.sign.keyPair();
  return {
    publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
    privateKey: Buffer.from(keyPair.secretKey).toString('base64')
  };
}

/**
 * Compute a shared secret using ECDH
 * @param privateKey Your private key (base64)
 * @param publicKey Other party's public key (base64)
 * @returns Shared secret as base64 string
 */
export function computeSharedSecret(privateKey: string, publicKey: string): string {
  const privateKeyBuffer = Buffer.from(privateKey, 'base64');
  const publicKeyBuffer = Buffer.from(publicKey, 'base64');
  
  const sharedSecret = nacl.box.before(publicKeyBuffer, privateKeyBuffer);
  return Buffer.from(sharedSecret).toString('base64');
}

/**
 * Encrypt a message using AES-GCM with the shared key
 * @param message Message to encrypt
 * @param sharedKey Shared key from ECDH exchange (base64)
 * @returns Encrypted message as base64 string
 */
export function encryptMessage(message: string, sharedKey: string): string {
  if (!sodiumReady) {
    throw new Error('Libsodium not initialized');
  }
  
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const messageBuffer = Buffer.from(message, 'utf8');
  const keyBuffer = Buffer.from(sharedKey, 'base64');
  
  const encrypted = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    messageBuffer,
    null,
    null,
    nonce,
    keyBuffer
  );
  
  // Combine nonce and ciphertext
  const result = new Uint8Array(nonce.length + encrypted.length);
  result.set(nonce);
  result.set(encrypted, nonce.length);
  
  return Buffer.from(result).toString('base64');
}

/**
 * Decrypt a message using AES-GCM with the shared key
 * @param encryptedMessage Encrypted message (base64)
 * @param sharedKey Shared key from ECDH exchange (base64)
 * @returns Decrypted message as string
 */
export function decryptMessage(encryptedMessage: string, sharedKey: string): string {
  if (!sodiumReady) {
    throw new Error('Libsodium not initialized');
  }
  
  const messageBuffer = Buffer.from(encryptedMessage, 'base64');
  const keyBuffer = Buffer.from(sharedKey, 'base64');
  
  const nonceLength = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  const nonce = messageBuffer.slice(0, nonceLength);
  const ciphertext = messageBuffer.slice(nonceLength);
  
  try {
    const decrypted = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      ciphertext,
      null,
      nonce,
      keyBuffer
    );
    
    return Buffer.from(decrypted).toString('utf8');
  } catch (error) {
    throw new Error('Failed to decrypt message: Invalid key or corrupted data');
  }
}

/**
 * Sign a message using Ed25519
 * @param message Message to sign
 * @param privateKey Private key (base64)
 * @returns Signature as base64 string
 */
export function signMessage(message: string, privateKey: string): string {
  const messageBuffer = Buffer.from(message, 'utf8');
  const privateKeyBuffer = Buffer.from(privateKey, 'base64');
  
  const signature = nacl.sign.detached(messageBuffer, privateKeyBuffer);
  return Buffer.from(signature).toString('base64');
}

/**
 * Verify a message signature using Ed25519
 * @param message Original message
 * @param signature Signature (base64)
 * @param publicKey Public key (base64)
 * @returns True if signature is valid
 */
export function verifyMessageSignature(message: string, signature: string, publicKey: string): boolean {
  const messageBuffer = Buffer.from(message, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'base64');
  const publicKeyBuffer = Buffer.from(publicKey, 'base64');
  
  return nacl.sign.detached.verify(messageBuffer, signatureBuffer, publicKeyBuffer);
}
