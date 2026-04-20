import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CartSidebar from "../components/CartSidebar";
import MenuItemCard from "../components/MenuItemCard";
import type { CartItem, MenuItem, Restaurant } from "../types";

const API_ROOT = import.meta.env.VITE_API_URL as string;
const API_BASE_URL = `${API_ROOT}/api`;

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function defaultDeliveryCoords() {
  return { lng: 72.5714, lat: 23.0225 };
}

export default function RestaurantMenuPage() {
  const { id } = useParams();
  const restaurantId = id || "";
  const navigate = useNavigate();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let alive = true;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!alive) return;
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        if (!alive) return;
        setGeo(null);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    axios
      .get(`${API_BASE_URL}/restaurant/${restaurantId}`, { headers: { ...authHeader() } })
      .then((res) => {
        if (!alive) return;
        const r = (res.data?.restaurant || res.data?.data?.restaurant || res.data?.Restaurant) as Restaurant | undefined;
        const items = (res.data?.menu || res.data?.items || res.data?.data?.menu || []) as MenuItem[];
        setRestaurant(r || null);
        setMenu(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load menu");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [restaurantId]);

  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const it of menu) {
      const key = it.category || "Other";
      map.set(key, [...(map.get(key) || []), it]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [menu]);

  const totalPrice = useMemo(
    () => cart.reduce((sum, c) => sum + c.price * c.quantity, 0),
    [cart]
  );

  const onAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.menuItemId === item._id);
      if (existing) return prev.map((p) => (p.menuItemId === item._id ? { ...p, quantity: p.quantity + 1 } : p));
      return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const onRemove = (menuItemId: string) => setCart((prev) => prev.filter((p) => p.menuItemId !== menuItemId));
  const onQuantityChange = (menuItemId: string, qty: number) =>
    setCart((prev) => prev.map((p) => (p.menuItemId === menuItemId ? { ...p, quantity: qty } : p)));

  const onPlaceOrder = async () => {
    if (cart.length === 0 || placing) return;
    setPlacing(true);
    setError(null);
    const coords = geo || defaultDeliveryCoords();
    try {
      const body = {
        restaurantId,
        items: cart.map((c) => ({ menuItemId: c.menuItemId, quantity: c.quantity })),
        deliveryLocation: { type: "Point", coordinates: [coords.lng, coords.lat] as [number, number] },
      };
      const res = await axios.post(`${API_BASE_URL}/order/add`, body, { headers: { ...authHeader() } });
      const orderId = (res.data?._id || res.data?.order?._id || res.data?.orderId) as string | undefined;
      if (!orderId) throw new Error("Order created but no order id returned");
      setCart([]);
      navigate(`/order/${orderId}/track`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Loading…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
        ) : !restaurant ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
            Restaurant not found.
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h1 className="text-xl font-bold text-slate-900">{restaurant.name}</h1>
              <p className="mt-1 text-sm text-slate-600">Add items to your cart and place an order.</p>
            </div>

            {menu.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
                No menu items yet.
              </div>
            ) : (
              <div className="space-y-6">
                {grouped.map(([category, items]) => (
                  <section key={category}>
                    <h2 className="mb-3 text-sm font-bold text-slate-900">{category}</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {items.map((it) => (
                        <MenuItemCard key={it._id} item={it} onAddToCart={onAddToCart} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <CartSidebar
        cart={cart}
        onRemove={onRemove}
        onQuantityChange={onQuantityChange}
        onPlaceOrder={onPlaceOrder}
        totalPrice={totalPrice}
        loading={placing}
      />
    </div>
  );
}

