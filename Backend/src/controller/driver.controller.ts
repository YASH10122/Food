import { Response } from "express";
import { AuthRequest } from "../middleware/authmiddleware";
import Driver  from "../model/driver.model";
import Order from "../model/order.model";
import { getIO } from "../config/socket";




export const updateDriverLocation = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { lng, lat } = req.body;

    const driver = await Driver.findOneAndUpdate(
      { userId: req.user?.id },
      {
        currentLocation: {
          type: "Point",
          coordinates: [lng, lat],
        },
      },
      { new: true }
    );

    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: "Location update failed" });
  }
};




export const getAvailableOrders = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const orders = await Order.find({
      status: "READY",
      driverId: { $exists: false },
    }).populate("restaurantId");

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};



export const claimOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.body;

    const driver = await Driver.findOne({
      userId: req.user?.id,
      isAvailable: true,
    });

    if (!driver) {
      return res.status(400).json({ message: "Driver not available" });
    }

    const order = await Order.findOne({
      _id: orderId,
      status: "READY",
      driverId: { $exists: false },
    });

    if (!order) {
      return res.status(400).json({ message: "Order already taken" });
    }

    // Assign driver
    order.driverId = driver._id;
    order.status = "PICKED";
    order.statusHistory.push({ status: "PICKED" });

    await order.save();

    // Mark driver busy
    driver.isAvailable = false;
    await driver.save();

    // 🔥 Emit update
    const io = getIO();
    io.to(orderId).emit("orderUpdated", order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Claim failed" });
  }
};


export const updateDeliveryStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const allowed = ["ON_THE_WAY", "DELIVERED"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const driver = await Driver.findOne({
      userId: req.user?.id,
    });

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const order = await Order.findById(orderId);

    if (!order || order.driverId?.toString() !== driver._id.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    order.status = status;
    order.statusHistory.push({ status });

    await order.save();

    // If delivered → free driver
    if (status === "DELIVERED") {
      await Driver.findByIdAndUpdate(order.driverId, {
        isAvailable: true,
      });
    }

    const io = getIO();
    io.to(orderId).emit("orderUpdated", order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};