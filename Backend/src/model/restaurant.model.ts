import mongoose from 'mongoose'; 

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true
        },
    }

});

restaurantSchema.index({ location: '2dsphere' });

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
export default Restaurant;