import { Request, Response } from "express";
import Order from "../model/order.model";
import MenuItem  from "../model/menuitem.model";
import Restaurant from "../model/restaurant.model";
import { getIO } from "../config/socket";
import { AuthRequest } from "../middleware/authmiddleware";
import  Driver  from "../model/driver.model";


const validTransitions: any = {
  PLACED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["READY"],
  READY: ["PICKED"],
  PICKED: ["ON_THE_WAY"],
  ON_THE_WAY: ["DELIVERED"],
};



//  Create Order
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId, items, deliveryLocation } = req.body;

    //  Validate restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items provided" });
    }

    //  Fetch menu items
    const menuItemIds = items.map((i: any) => i.menuItemId);

    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      restaurantId,
      isAvailable: true,
    });

    // Map for fast lookup
    const menuMap = new Map(
      menuItems.map((item) => [item._id.toString(), item])
    );

    let totalPrice = 0;

    //  Create snapshot items
    const orderItems = items.map((i: any) => {
      const menu = menuMap.get(i.menuItemId);

      if (!menu) {
        throw new Error(`Invalid menu item: ${i.menuItemId}`);
      }

      const itemTotal = menu.price * i.quantity;
      totalPrice += itemTotal;

      return {
        menuItemId: menu._id,
        name: menu.name,
        price: menu.price,
        quantity: i.quantity,
      };
    });

    //  Create order
    const order = await Order.create({
      customerId: req.user?.id,
      restaurantId,
      items: orderItems,
      totalPrice,
      deliveryLocation,
      status: "PLACED",
      statusHistory: [{ status: "PLACED" }],
    });

    //  Emit real-time event
    const io = getIO();
    io.emit("newOrder", order); // restaurant dashboard listens

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({
      message: "Order creation failed",
      error: error.message,
    });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ message: "Order not found" });

  const allowed = validTransitions[order.status] || [];

  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status transition" });
  }

  order.status = status;
  order.statusHistory.push({ status });

  await order.save();

  //  Emit real-time update
  const io = getIO();
  io.to(orderId).emit("orderUpdated", order);

  res.json(order);
};

// Manager: Accept Order
export const acceptOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order || order.status !== "PLACED") {
      return res.status(400).json({ message: "Invalid order state" });
    }

    order.status = "ACCEPTED";
    order.statusHistory.push({ status: "ACCEPTED" });

    await order.save();

    const io = getIO();
    io.to(orderId).emit("orderUpdated", order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Accept failed" });
  }
};


//  Manager: Reject Order
export const rejectOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order || order.status !== "PLACED") {
      return res.status(400).json({ message: "Invalid order state" });
    }

    order.status = "REJECTED";
    order.statusHistory.push({ status: "REJECTED" });

    await order.save();

    const io = getIO();
    io.to(orderId).emit("orderUpdated", order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Reject failed" });
  }
};


//  Manager: Mark READY (unlock drivers)
export const markOrderReady = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order || order.status !== "ACCEPTED") {
      return res.status(400).json({ message: "Invalid order state" });
    }

    order.status = "READY";
    order.statusHistory.push({ status: "READY" });

    await order.save();

    const io = getIO();

    // Notify drivers (available orders)
  io.to("drivers").emit("orderReady", order);

    // Notify customer tracking page
    io.to(orderId).emit("orderUpdated", order);

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Ready update failed" });
  }
};


export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await Order.find({
      customerId: req.user?.id,
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};


export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("restaurantId", "name location")
      .populate("driverId");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    //Allow only owner / driver / manager
    if (
      order.customerId.toString() !== req.user?.id &&
      order.driverId?.toString() !== req.user?.id
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch order" });
  }
};

export const getRestaurantOrders = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { restaurantId } = req.params;

    // Check ownership
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      owner: req.user?.id,
    });

    if (!restaurant) {
      return res.status(403).json({ message: "Not your restaurant" });
    }

    const orders = await Order.find({ restaurantId })
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch restaurant orders" });
  }
};



export const getDriverActiveOrder = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const driver = await Driver.findOne({
      userId: req.user?.id,
    });

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const order = await Order.findOne({
      driverId: driver._id,
      status: { $in: ["PICKED", "ON_THE_WAY"] },
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch active order" });
  }
};

export const submitOrderRatings = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const { restaurantRating, driverRating } = req.body as {
      restaurantRating?: number;
      driverRating?: number;
    };

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.customerId.toString() !== req.user?.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (order.status !== "DELIVERED") {
      return res.status(400).json({ message: "You can only rate after delivery" });
    }

    if (restaurantRating === undefined && driverRating === undefined) {
      return res.status(400).json({ message: "Provide restaurantRating and/or driverRating (1–5)" });
    }

    if (restaurantRating !== undefined) {
      const r = Number(restaurantRating);
      if (!Number.isInteger(r) || r < 1 || r > 5) {
        return res.status(400).json({ message: "restaurantRating must be integer 1–5" });
      }
      if (order.restaurantRating != null) {
        return res.status(400).json({ message: "Restaurant already rated" });
      }
      order.restaurantRating = r;
    }

    if (driverRating !== undefined) {
      const d = Number(driverRating);
      if (!Number.isInteger(d) || d < 1 || d > 5) {
        return res.status(400).json({ message: "driverRating must be integer 1–5" });
      }
      if (!order.driverId) {
        return res.status(400).json({ message: "No driver on this order" });
      }
      if (order.driverRating != null) {
        return res.status(400).json({ message: "Driver already rated" });
      }
      order.driverRating = d;
    }

    await order.save();

    try {
      const io = getIO();
      io.to(orderId).emit("orderUpdated", order);
    } catch {
      // socket optional
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to save ratings" });
  }
};