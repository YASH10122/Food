import express from "express";
import {
  updateDriverLocation,
  getAvailableOrders,
  claimOrder,
  updateDeliveryStatus,
} from "../controller/driver.controller";

import { authMiddleware, restrictTo } from "../middleware/authmiddleware";

const router = express.Router();

// Driver only
router.post("/location", authMiddleware, restrictTo("driver"), updateDriverLocation);
router.get("/orders", authMiddleware, restrictTo("driver"), getAvailableOrders);
router.post("/claim", authMiddleware, restrictTo("driver"), claimOrder);
router.patch("/order/:orderId", authMiddleware, restrictTo("driver"), updateDeliveryStatus);

export default router;