import { Router } from 'express';
import SignalController from '../controllers/signal.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes are protected
router.use(authenticate);

router.post('/send', SignalController.sendSignal);
router.get('/pending', SignalController.getPendingSignals);

export default router;
