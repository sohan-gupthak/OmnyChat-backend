// User types
export interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserDTO {
  id: number;
  username: string;
  email: string;
}

// Authentication types
import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: UserDTO;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: number;
  email: string;
}

// Key types
export interface UserKey {
  id: number;
  user_id: number;
  public_key: string;
  signed_key: string;
  key_type: KeyType;
  created_at: Date;
  updated_at: Date;
}

export type KeyType = 'ecdh' | 'ed25519';

export interface KeyPublishData {
  public_key: string;
  key_type: KeyType;
}

// WebSocket types
export interface WebSocketClient {
  userId: number;
  ws: WebSocket;
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
}

export type WebSocketMessageType = 
  | 'connect'
  | 'disconnect'
  | 'signal'
  | 'message'
  | 'presence'
  | 'error';

export interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  recipient: number;
  data: any;
}

export interface ChatMessage {
  recipient: number;
  encryptedContent: string;
  timestamp: number;
  id?: number;
}

// Contact types
export interface Contact {
  id: number;
  user_id: number;
  contact_id: number;
  created_at: Date;
}

// Contact request types
export interface ContactRequest {
  id: number;
  sender_id: number;
  recipient_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: Date;
  updated_at: Date;
}

export interface ContactRequestDTO extends ContactRequest {
  sender?: UserDTO;
  recipient?: UserDTO;
}

// Message types (for offline storage)
export interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  encrypted_content: string;
  is_delivered: boolean;
  created_at: Date;
  delivered_at?: Date;
}
