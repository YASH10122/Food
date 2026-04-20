import express from 'express';
import { createRestaurant, getAllRestaurants, getRestaurantById, getRestaurants } from '../controller/restaurant.controller';
import { restrictTo, authMiddleware } from '../middleware/authmiddleware';

const router = express.Router();

router.post("/Add", authMiddleware, restrictTo("manager"), createRestaurant);
router.get("/my", authMiddleware, restrictTo("manager"), getRestaurants);
// router.put("/:id", authMiddleware, restrictTo("manager"), updateRestaurant);

// // Public / Customer
router.get("/", getAllRestaurants);
router.get("/:id", getRestaurantById);

export default router;