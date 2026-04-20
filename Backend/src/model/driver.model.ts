import mongoose from "mongoose";


const driverSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    currentLocation: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        },
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
});

driverSchema.index({ currentLocation: '2dsphere' });

const Driver = mongoose.model("Driver", driverSchema);
export default Driver;
