import { Server } from "socket.io";
import Order from "../model/order.model";
import  Driver  from "../model/driver.model";

let io: Server;


export const initSocket = (server: any) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        }
    });

    io.on('connection', (socket) => {
        console.log("User connected:", socket.id);

        socket.on('joinOrder', (orderId) => {
            socket.join(orderId);
        });

        socket.on(
  "driverLocationUpdate",
  async ({ orderId, location, userId }) => {
    try {
      const driver = await Driver.findOne({ userId });

      const order = await Order.findById(orderId);

      if (!driver || !order) return;

      //  Ensure correct driver is sending location
      if (order.driverId?.toString() !== driver._id.toString()) {
        return;
      }

      //  Emit to customer
      io.to(orderId).emit("driverLocation", location);

      //  (Optional) Save to DB
      driver.currentLocation = {
        type: "Point",
        coordinates: [location.lng, location.lat],
      };

      await driver.save();
    } catch (err) {
      console.log("Location error");
    }
  }
);


        socket.on('disconnect', () => {
            console.log("Disconnected:", socket.id);
        });
    });
    return io;

};

export const getIO = () => {
    if (!io) throw new Error("Socket not initialized");
    return io;
}


