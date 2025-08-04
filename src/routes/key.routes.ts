import { Router } from 'express';
import KeyController from '../controllers/key.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/server', KeyController.getServerPublicKey);
router.post('/verify', KeyController.verifyKey);
router.get('/:userId', KeyController.getKey);

// Protected routes
router.post('/publish', authenticate, KeyController.publishKey);

export default router;
