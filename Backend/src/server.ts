import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import cors from "cors";
import http from "http";
import { initSocket } from "./config/socket";

import userRouter from "./routes/user.route";
import restaurantRouter from "./routes/restaurant.routes";
import menuitemRouter from "./routes/menuItem.routes";
import orderRouter from "./routes/order.routes";
import driverRouter from "./routes/driver.routes";

dotenv.config();

const app = express()

app.use(express.json())
app.use(cors());

const PORT = process.env.PORT || 8888;

const server = http.createServer(app);

initSocket(server);

connectDB();

app.use('/api/user', userRouter);
app.use('/api/restaurant', restaurantRouter);
app.use('/api/menuitem', menuitemRouter)
app.use('/api/order', orderRouter)
app.use('/api/driver', driverRouter)

server.listen(PORT, async () => {
  console.log(`server is running on port - ${PORT}`);
});