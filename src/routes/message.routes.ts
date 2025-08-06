import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import MessageController from '../controllers/message.controller';

const router = Router();

// Protected routes
router.get('/offline', authenticate, MessageController.getOfflineMessages);
router.post('/mark-read', authenticate, MessageController.markMessagesAsRead);
router.post('/', authenticate, MessageController.storeMessage);
router.post('/received', authenticate, MessageController.storeReceivedMessage);

export default router;
