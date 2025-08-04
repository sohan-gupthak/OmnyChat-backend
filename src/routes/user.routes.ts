import { Router } from 'express';
import UserController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes are protected
router.use(authenticate);

router.get('/search', UserController.searchUsers);
router.get('/all', UserController.getAllUsers);
router.get('/contacts', UserController.getUserContacts);
router.post('/contacts', UserController.addContact);
router.get('/:userId', UserController.getUserById);

export default router;
