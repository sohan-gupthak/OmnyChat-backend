import { Router } from 'express';
import ContactRequestController from '../controllers/contact-request.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get pending contact requests
router.get('/pending', ContactRequestController.getPendingRequests);

// Get sent contact requests
router.get('/sent', ContactRequestController.getSentRequests);

// Send a contact request
router.post('/send', ContactRequestController.sendRequest);

// Accept a contact request
router.post('/accept/:requestId', ContactRequestController.acceptRequest);

// Reject a contact request
router.post('/reject/:requestId', ContactRequestController.rejectRequest);

// Cancel a contact request
router.post('/cancel/:requestId', ContactRequestController.cancelRequest);

export default router;
