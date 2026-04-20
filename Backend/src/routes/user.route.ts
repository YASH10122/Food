import express from 'express';
import { getUser, loginUser, registerUser } from '../controller/user.controller';
import { authMiddleware } from '../middleware/authmiddleware';


const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', authMiddleware, getUser);

export default router;