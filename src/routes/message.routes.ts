import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import MessageController from '../controllers/message.controller';

const router = Router();

// Protected routes
router.get('/offline', authenticate, MessageController.getOfflineMessages);
router.post('/mark-read', authenticate, MessageController.markMessagesAsRead);
router.post('/store', authenticate, MessageController.storeMessage);

export default router;
