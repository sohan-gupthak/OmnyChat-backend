import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';

// Import routes
import { authRoutes, keyRoutes, messageRoutes, signalRoutes, userRoutes, contactRequestRoutes } from './routes';

// Import WebSocket handler
import { setupWebSocketServer } from './websocket';

// Import crypto utilities
import { initializeServerKeys } from './utils/crypto';

// Load environment variables
dotenv.config();

// Initialize server keys if they don't exist
initializeServerKeys();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/signal', signalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact-requests', contactRequestRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server with explicit /ws path
const wss = new WebSocketServer({ 
  server,
  path: '/ws' 
});
setupWebSocketServer(wss);
console.log('WebSocket server initialized at path: /ws');

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Server public key available:', !!process.env.SERVER_PUBLIC_KEY);
});

export default server;
