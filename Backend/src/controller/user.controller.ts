import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import User from "../model/user.model";
import Driver from "../model/driver.model";



const generateToken = (id: string, role: string) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
        expiresIn: '3d'
    });
}


export const registerUser = async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role ||  password.length < 5) {
        return res.status(400).json({ message: "Please provide all required fields" });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role
        });

        if (role === "driver") {
          await Driver.create({
            userId: user._id,
            currentLocation: {
              type: "Point",
              coordinates: [72.5714, 23.0225],
            },
            isAvailable: true,
          });
        }

        const token = generateToken(user._id.toString(), user.role);
        res.status(201).json({ message: "User registered successfully", token });
    } catch (error) {
        res.status(500).json({ message: "Register failed", error });
    }
}


export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Ensure driver profile exists (older accounts may not have one)
        if (user.role === "driver") {
          const existingDriver = await Driver.findOne({ userId: user._id });
          if (!existingDriver) {
            await Driver.create({
              userId: user._id,
              currentLocation: {
                type: "Point",
                coordinates: [72.5714, 23.0225],
              },
              isAvailable: true,
            });
          }
        }

        const token = generateToken(user._id.toString(), user.role);
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        });
    } catch (error) {
        res.status(500).json({ message: "Login failed", error });

    }
}

// export const getUser = async (req: Request, res: Response) => {
//     try {

//         const user = await User.findById(req.params.id).select('-password');
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }
//         res.json(user);
//     } catch (error) {
//         res.status(500).json({ message: "Failed to get user", error });
//     }
// };


// export const getUsers = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user?.id;

//     const user = await User.findById(userId);

//     res.json(user);
//   } catch (error) {
//     res.status(500).json({ message: "Failed to fetch user" });
//   }
// };

export const getUser = async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
};