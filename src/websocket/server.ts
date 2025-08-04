import { WebSocketServer, WebSocket as WS } from 'ws';
import { verifyToken } from '../utils/jwt';
import { WebSocketMessage, ChatMessage } from '../types';
import redisClient from '../config/redis';
import MessageModel from '../models/message.model';

// Define WebSocketClient type with WS
export interface WebSocketClient {
  userId: number;
  ws: WS;
}

// Store connected clients
let clients: WebSocketClient[] = [];

/**
 * Get all connected WebSocket clients
 * @returns Array of connected clients
 */
export function getWebSocketClients(): WebSocketClient[] {
  return clients;
}

/**
 * Set up the WebSocket server
 * @param wss WebSocketServer instance
 */
export function setupWebSocketServer(wss: WebSocketServer) {
  wss.on('connection', (ws: WS) => {
    console.log('Client connected to WebSocket');
    
    // Handle authentication
    ws.on('message', async (message: string) => {
      try {
        const data: WebSocketMessage = JSON.parse(message);
        
        // Handle different message types
        switch (data.type) {
          case 'connect':
            handleConnect(ws, data.payload);
            break;
            
          case 'disconnect':
            handleDisconnect(ws);
            break;
            
          case 'signal':
            handleSignal(ws, data.payload);
            break;
            
          case 'message':
            handleMessage(ws, data.payload);
            break;
            
          default:
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Unknown message type' }
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' }
        }));
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      handleDisconnect(ws);
    });
  });
  
  console.log('WebSocket server initialized');
}

/**
 * Handle client connection
 * @param ws WebSocket connection
 * @param payload Connection payload with token
 */
async function handleConnect(ws: WS, payload: any) {
  try {
    // Verify token
    const token = payload.token;
    const decoded = verifyToken(token);
    
    if (!decoded) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Invalid token' }
      }));
      ws.close();
      return;
    }
    
    const userId = decoded.userId;
    
    // Add client to connected clients
    clients = clients.filter(client => client.userId !== userId);
    clients.push({ userId, ws });
    
    // Update presence in Redis
    await redisClient.set(`presence:${userId}`, 'online');
    await redisClient.expire(`presence:${userId}`, 60); // Expire after 60 seconds if not refreshed
    
    // Send confirmation
    ws.send(JSON.stringify({
      type: 'connect',
      payload: { success: true, userId }
    }));
    
    // Broadcast presence update
    broadcastPresence(userId, 'online');
    
    // Check for undelivered messages
    const undeliveredMessages = await MessageModel.getUndeliveredMessages(userId);
    
    if (undeliveredMessages.length > 0) {
      // Send undelivered messages
      ws.send(JSON.stringify({
        type: 'message',
        payload: {
          pendingMessages: undeliveredMessages.map(msg => ({
            id: msg.id,
            sender: msg.sender_id,
            content: msg.encrypted_content,
            timestamp: msg.created_at
          }))
        }
      }));
      
      // Mark messages as delivered
      await MessageModel.markAsDelivered(undeliveredMessages.map(msg => msg.id));
    }
  } catch (error) {
    console.error('WebSocket connect error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Connection error' }
    }));
    ws.close();
  }
}

/**
 * Handle client disconnection
 * @param ws WebSocket connection
 */
async function handleDisconnect(ws: WS) {
  // Find client
  const client = clients.find(client => client.ws === ws);
  
  if (client) {
    // Update presence in Redis
    await redisClient.set(`presence:${client.userId}`, 'offline');
    
    // Remove client from connected clients
    clients = clients.filter(c => c.ws !== ws);
    
    // Broadcast presence update
    broadcastPresence(client.userId, 'offline');
    
    console.log(`Client ${client.userId} disconnected`);
  }
}

/**
 * Handle WebRTC signaling
 * @param ws WebSocket connection
 * @param payload Signal payload
 */
function handleSignal(ws: WS, payload: any) {
  // Find sender
  const sender = clients.find(client => client.ws === ws);
  
  if (!sender) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Not authenticated' }
    }));
    return;
  }
  
  // Find recipient
  const recipient = clients.find(client => client.userId === payload.recipient);
  
  if (recipient) {
    // Forward signal to recipient
    recipient.ws.send(JSON.stringify({
      type: 'signal',
      payload: {
        sender: sender.userId,
        type: payload.type,
        data: payload.data
      }
    }));
  } else {
    // Recipient is offline
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Recipient is offline' }
    }));
  }
}

/**
 * Handle chat message
 * @param ws WebSocket connection
 * @param payload Message payload
 */
async function handleMessage(ws: WS, payload: ChatMessage) {
  // Find sender
  const sender = clients.find(client => client.ws === ws);
  
  if (!sender) {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { message: 'Not authenticated' }
    }));
    return;
  }
  
  // Find recipient
  const recipient = clients.find(client => client.userId === payload.recipient);
  
  if (recipient) {
    // Forward message to recipient
    recipient.ws.send(JSON.stringify({
      type: 'message',
      payload: {
        sender: sender.userId,
        encryptedContent: payload.encryptedContent,
        timestamp: payload.timestamp
      }
    }));
    
    // Send delivery confirmation to sender
    ws.send(JSON.stringify({
      type: 'message',
      payload: {
        delivered: true,
        recipient: payload.recipient,
        timestamp: payload.timestamp
      }
    }));
  } else {
    // Recipient is offline, store message for later delivery
    try {
      await MessageModel.storeMessage(
        sender.userId,
        payload.recipient,
        payload.encryptedContent
      );
      
      // Send storage confirmation to sender
      ws.send(JSON.stringify({
        type: 'message',
        payload: {
          stored: true,
          recipient: payload.recipient,
          timestamp: payload.timestamp
        }
      }));
    } catch (error) {
      console.error('Store message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Failed to store message' }
      }));
    }
  }
}

/**
 * Broadcast presence update to all connected clients
 * @param userId User ID
 * @param status Online status
 */
function broadcastPresence(userId: number, status: 'online' | 'offline') {
  clients.forEach(client => {
    client.ws.send(JSON.stringify({
      type: 'presence',
      payload: {
        userId,
        status
      }
    }));
  });
}

// This function is already defined above

/**
 * Start a presence heartbeat to keep track of online users
 */
export function startPresenceHeartbeat() {
  // Update presence every 30 seconds
  setInterval(async () => {
    for (const client of clients) {
      await redisClient.set(`presence:${client.userId}`, 'online');
      await redisClient.expire(`presence:${client.userId}`, 60);
    }
  }, 30000);
}

/**
 * Check if a user is online
 * @param userId User ID
 * @returns True if user is online
 */
export async function isUserOnline(userId: number): Promise<boolean> {
  const status = await redisClient.get(`presence:${userId}`);
  return status === 'online';
}
