import { Request, Response } from 'express';
import { AuthRequest, SignalMessage } from '../types';
import { getWebSocketClients, WebSocketClient } from '../websocket';
import MessageModel from '../models/message.model';

/**
 * Signal controller for handling WebRTC signaling
 */
export default class SignalController {
  /**
   * Send a signal to another user
   * @param req Request
   * @param res Response
   */
  static async sendSignal(req: AuthRequest, res: Response) {
    try {
      const senderId = req.user!.id;
      const signalData: SignalMessage = req.body as SignalMessage;
      
      // Validate input
      if (!signalData.recipient || !signalData.type || !signalData.data) {
        return res.status(400).json({ message: 'Recipient, type, and data are required' });
      }
      
      // Get WebSocket clients
      const clients = getWebSocketClients();
      
      // Find recipient's WebSocket connection
      const recipientClient = clients.find((client: WebSocketClient) => client.userId === signalData.recipient);
      
      if (recipientClient) {
        // Send signal directly via WebSocket
        recipientClient.ws.send(JSON.stringify({
          type: 'signal',
          payload: {
            sender: senderId,
            type: signalData.type,
            data: signalData.data
          }
        }));
        
        return res.status(200).json({ message: 'Signal sent successfully' });
      } else {
        // Recipient is offline, store signal for later delivery
        // For ICE candidates, we don't need to store them as they're only relevant during connection setup
        if (signalData.type !== 'ice-candidate') {
          await MessageModel.storeMessage(
            senderId,
            signalData.recipient,
            JSON.stringify({
              type: 'signal',
              signalType: signalData.type,
              data: signalData.data
            })
          );
        }
        
        return res.status(202).json({ message: 'Recipient offline, signal queued for delivery' });
      }
    } catch (error) {
      console.error('Send signal error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
  
  /**
   * Get pending signals for the current user
   * @param req Request
   * @param res Response
   */
  static async getPendingSignals(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      
      // Get undelivered messages
      const messages = await MessageModel.getUndeliveredMessages(userId);
      
      // Filter for signal messages
      const signals = messages
        .map(msg => {
          try {
            const content = JSON.parse(msg.encrypted_content);
            if (content.type === 'signal') {
              return {
                id: msg.id,
                sender: msg.sender_id,
                type: content.signalType,
                data: content.data,
                timestamp: msg.created_at
              };
            }
            return null;
          } catch (e) {
            return null;
          }
        })
        .filter((signal): signal is { id: number; sender: number; type: string; data: any; timestamp: Date } => signal !== null);
      
      // Mark messages as delivered
      if (signals.length > 0) {
        const messageIds = signals.map(signal => signal.id);
        await MessageModel.markAsDelivered(messageIds);
      }
      
      return res.status(200).json({
        signals
      });
    } catch (error) {
      console.error('Get pending signals error:', error);
      return res.status(500).json({ message: 'Server error' });
    }
  }
}
