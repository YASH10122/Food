export type Role = "customer" | "manager" | "driver";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  token: string;
}

export interface Restaurant {
  _id: string;
  name: string;
  location: { type: string; coordinates: [number, number] };
}

export interface MenuItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
  restaurantId: string;
}

export type OrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "REJECTED"
  | "READY"
  | "PICKED"
  | "ON_THE_WAY"
  | "DELIVERED";

export interface Order {
  _id: string;
  customerId: string;
  restaurantId: string;
  driverId?: string;
  items: { menuItemId: string; name: string; price: number; quantity: number }[];
  status: OrderStatus;
  statusHistory: { status: OrderStatus; timestamp: string }[];
  deliveryLocation: { type: string; coordinates: [number, number] };
  totalPrice: number;
  createdAt: string;
  /** 1–5, set once after delivery */
  restaurantRating?: number;
  /** 1–5, set once after delivery (only if a driver was assigned) */
  driverRating?: number;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

