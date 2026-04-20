
import { Request, Response } from 'express';
import Restaurant from '../model/restaurant.model';
import { AuthRequest } from '../middleware/authmiddleware';
import MenuItem from '../model/menuitem.model';


export const createRestaurant = async (req: AuthRequest, res: Response) => {
    try {
        const { name, coordinates } = req.body;


        const restaurant = await Restaurant.create({
            name,
            location: {
                type: 'Point',
                coordinates
            },
            owner: req.user?.id
        });



        res.status(201).json(restaurant);
    } catch (error) {

        res.status(500).json({ message: 'failed to create restaurant' });
    }
};

export const getRestaurants = async (req: AuthRequest, res: Response) => {
    try {
        const restaurants = await Restaurant.find({
            owner: req.user?.id
        });
        res.json(restaurants);
    } catch (error) {
        res.status(500).json({ message: 'failed to fetch restaurants' });
    }
};


// //  Update Restaurant
// export const updateRestaurant = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;

//     const restaurant = await Restaurant.findOne({
//       _id: id,
//       owner: req.user?.id,
//     });

//     if (!restaurant) {
//       return res.status(404).json({ message: "Restaurant not found" });
//     }

//     const { name, coordinates } = req.body;

//     if (name) restaurant.name = name;

//     if (coordinates) {
//       restaurant.location = {
//         type: "Point",
//         coordinates,
//       };
//     }

//     await restaurant.save();

//     res.json(restaurant);
//   } catch (error) {
//     res.status(500).json({ message: "Update failed" });
//   }
// };


//  Get All Restaurants (Customer)
export const getAllRestaurants = async (req: Request, res: Response) => {
  try {
    const { lng, lat } = req.query;

    let restaurants;


    if (lng && lat) {
      restaurants = await Restaurant.find({
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [Number(lng), Number(lat)],
            },
            $maxDistance: 10000, 
          },
        },
      });
    } else {
      restaurants = await Restaurant.find();
    }

    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch restaurants" });
  }
};


//  Get Single Restaurant + Menu
export const getRestaurantById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const menu = await MenuItem.find({
      restaurantId: id,
    });

    res.json({
      restaurant,
      menu,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch restaurant" });
  }
};