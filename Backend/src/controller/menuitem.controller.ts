import { AuthRequest } from "../middleware/authmiddleware";
import  Restaurant  from "../model/restaurant.model";
import { Response } from "express";
import  MenuItem  from "../model/menuitem.model";

export const createMenuItem = async(req: AuthRequest, res: Response) =>{
    try{
        const { name, price, category, restaurantId } = req.body;

        const owner = await Restaurant.findOne(
            {
                _id: restaurantId,
                owner: req.user?.id,
            });

        if(!owner){
            return res.status(403).json({ message: 'You are not the owner' });
        }
        
    const menuItem = await MenuItem.create({
        name,
        price,
        category,
        restaurantId
    });

    res.status(201).json(menuItem);
    } catch (error) {
        res.status(500).json({ message: 'fail to add menu' });
    }
}

export const getMenuItem = async (req: AuthRequest, res: Response) => {
    try{
        const { restaurantId } = req.params;

        const owner = await Restaurant.findOne(
            {
                _id: restaurantId,
                owner: req.user?.id,
            }); 
        if(!owner){
            return res.status(403).json({ message: 'You are not the owner' });
        }

        const menuItem = await MenuItem.find({ restaurantId });

        res.status(200).json(menuItem);
    } catch (error) {
        res.status(500).json({ message: 'fail to get menu' });
    }
}



//  Update Menu Item
export const updateMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const item = await MenuItem.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    // Check ownership
    const restaurant = await Restaurant.findOne({
      _id: item.restaurantId,
      owner: req.user?.id,
    });

    if (!restaurant) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { name, price, category, isAvailable } = req.body;

    if (name) item.name = name;
    if (price) item.price = price;
    if (category) item.category = category;
    if (isAvailable !== undefined) item.isAvailable = isAvailable;

    await item.save();

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};


//  Delete Menu Item
export const deleteMenuItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const item = await MenuItem.findById(id);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const restaurant = await Restaurant.findOne({
      _id: item.restaurantId,
      owner: req.user?.id,
    });

    if (!restaurant) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await item.deleteOne();

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
};