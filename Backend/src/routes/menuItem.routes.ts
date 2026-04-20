import express from 'express';
import { createMenuItem, deleteMenuItem, getMenuItem, updateMenuItem } from '../controller/menuitem.controller';
import { restrictTo, authMiddleware } from '../middleware/authmiddleware';

const router = express.Router();

router.post("/add", authMiddleware, restrictTo("manager"), createMenuItem);
router.get("/:restaurantId", authMiddleware, restrictTo("manager"), getMenuItem);
router.put("/:id", authMiddleware, restrictTo("manager"), updateMenuItem);
router.delete("/:id", authMiddleware, restrictTo("manager"), deleteMenuItem);


export default router;