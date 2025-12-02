import { Router } from 'express';
import {
  createMessage,
  getMessageDetail,
  getUserMessages,
  markMessageRead,
  replyMessage,
} from '../controllers/messageController';
import { authenticateToken, requireUser } from '../middleware/auth';

const router = Router();

router.use(authenticateToken, requireUser);

router.get('/', getUserMessages);
router.get('/:id', getMessageDetail);
router.post('/', createMessage);
router.post('/:id/reply', replyMessage);
router.patch('/:id/read', markMessageRead);

export default router;
