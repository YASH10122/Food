import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    category:{
        type: String,
        required: true
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Restaurant",
        required: true
    }
},
    {timestamps: true}
);

const MenuItem = mongoose.model("MenuItem", menuItemSchema);
export default MenuItem;