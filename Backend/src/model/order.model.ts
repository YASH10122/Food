import mongoose from 'mongoose';

export type OrderStatus =
    | "PLACED"
    | "ACCEPTED"
    | "REJECTED"
    | "READY"
    | "PICKED"
    | "ON_THE_WAY"
    | "DELIVERED";


const orderSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
    },
    items: [
        {
            menuItemId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "MenuItem",
            },
            name: String,
            price: Number,
            quantity: Number,
        }
    ],
    status: {
        type: String,
        enum: ['PLACED', 'ACCEPTED', 'REJECTED', 'READY', 'PICKED', 'ON_THE_WAY', 'DELIVERED'],
        default: 'PLACED'
    },
    statusHistory: [
        {
            status: String,
            timestamp: {
                type: Date,
                default: Date.now
            },
        },
    ],
    deliveryLocation: {
        type: {
            type: String,
            enum: ["Point"],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        },
    },
    totalPrice: {
        type: Number,
        required: true
    },
    restaurantRating: {
        type: Number,
        min: 1,
        max: 5,
    },
    driverRating: {
        type: Number,
        min: 1,
        max: 5,
    },


},
    {timestamps: true}
);

orderSchema.index({ deliveryLocation: '2dsphere' });

const Order = mongoose.model('Order', orderSchema);
export default Order;

