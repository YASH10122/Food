import express from "express";
import {
    acceptOrder,
    createOrder,
    markOrderReady,
    rejectOrder,
    updateOrderStatus,
} from "../controller/order.controller";

import {
    getMyOrders,
    getOrderById,
    getRestaurantOrders,
    getDriverActiveOrder,
    submitOrderRatings,
} from "../controller/order.controller";

import { authMiddleware, restrictTo } from "../middleware/authmiddleware";

const router = express.Router();

// Customer places order
router.post("/add", authMiddleware, restrictTo("customer"), createOrder);

// Status updates (already exists)
router.patch("/:orderId/status", authMiddleware, updateOrderStatus);

// Manager actions
router.patch("/:orderId/accept", authMiddleware, restrictTo("manager"), acceptOrder);

router.patch("/:orderId/reject", authMiddleware, restrictTo("manager"), rejectOrder);

router.patch("/:orderId/ready", authMiddleware, restrictTo("manager"), markOrderReady);

router.patch("/:orderId/rate", authMiddleware, restrictTo("customer"), submitOrderRatings);

// Customer
router.get("/my", authMiddleware, restrictTo("customer"), getMyOrders);

// Manager dashboard (must be before "/:orderId" so paths are not captured as order ids)
router.get("/restaurant/:restaurantId", authMiddleware, restrictTo("manager"), getRestaurantOrders);

// Driver
router.get("/driver/active", authMiddleware, restrictTo("driver"), getDriverActiveOrder);

// Tracking page (single order by id — keep after static path segments)
router.get("/:orderId", authMiddleware, getOrderById);

export default router;