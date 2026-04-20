import mongoose from 'mongoose';

export type Role = "customer" | "manager" | "driver";


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true    
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['customer', 'manager', 'driver'],
        required: true
    },
},
    {timestamps: true}
)

const User = mongoose.model('User', userSchema);

export default User;