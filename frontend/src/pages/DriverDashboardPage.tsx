import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import OrderCard from "../components/OrderCard";
import type { Order } from "../types";

const API_ROOT = import.meta.env.VITE_API_URL as string;
const API_BASE_URL = `${API_ROOT}/api`;
const SOCKET_URL = API_ROOT;

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getUserId() {
  const raw = localStorage.getItem("user");
  try {
    const u = raw ? (JSON.parse(raw) as any) : null;
    return u?._id as string | undefined;
  } catch {
    return undefined;
  }
}

export default function DriverDashboardPage() {
  const [available, setAvailable] = useState<Order[]>([]);
  const [active, setActive] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const tickRef = useRef<number | null>(null);

  const itemsCount = useMemo(() => (o: Order) => o.items.reduce((sum, it) => sum + it.quantity, 0), []);

  const refresh = async () => {
    setError(null);
    try {
      const [availRes, activeRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/driver/orders`, { headers: { ...authHeader() } }),
        axios.get(`${API_BASE_URL}/order/driver/active`, { headers: { ...authHeader() } }),
      ]);
      const availList = (availRes.data?.orders || availRes.data || []) as Order[];
      const activeOrder = (activeRes.data?.order || activeRes.data || null) as Order | null;
      setAvailable(Array.isArray(availList) ? availList : []);
      setActive(activeOrder && (activeOrder as any)._id ? activeOrder : null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load driver dashboard");
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    refresh()
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, { transports: ["websocket"], reconnection: true });
    socketRef.current = socket;
    socket.on("orderReady", (o: Order) => {
      setAvailable((prev) => {
        if (prev.some((p) => p._id === o._id)) return prev;
        return [o, ...prev];
      });
    });
    return () => {
      socketRef.current = null;
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!active?._id) {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    const userId = getUserId();
    const socket = socketRef.current;

    const send = () => {
      if (!navigator.geolocation || !socket) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          socket.emit("driverLocationUpdate", {
            orderId: active._id,
            location: { lat, lng },
            userId,
          });
        },
        () => {
          // ignore; we still can deliver without location
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    };

    send();
    tickRef.current = window.setInterval(send, 10_000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [active?._id]);

  const claim = async (orderId: string) => {
    setError(null);
    const before = available;
    setAvailable((prev) => prev.filter((p) => p._id !== orderId));
    try {
      const res = await axios.post(`${API_BASE_URL}/driver/claim`, { orderId }, { headers: { ...authHeader() } });
      const claimed = (res.data?.order || res.data) as Order;
      setActive(claimed);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to claim order");
      setAvailable(before);
    }
  };

  const updateActiveStatus = async (status: "ON_THE_WAY" | "DELIVERED") => {
    if (!active) return;
    setError(null);
    const before = active;
    setActive({
      ...active,
      status,
      statusHistory: [...(active.statusHistory || []), { status, timestamp: new Date().toISOString() }],
    });
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/driver/order/${active._id}`,
        { status },
        { headers: { ...authHeader() } }
      );
      const updated = (res.data?.order || res.data) as Order;
      setActive(updated);
      if (updated.status === "DELIVERED") {
        // after delivery, refresh available queue
        refresh();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update order status");
      setActive(before);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Driver dashboard</h1>
        <p className="text-sm text-slate-600">Claim ready orders and update delivery status.</p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Loading…</div>
      ) : null}

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {active ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-bold text-slate-900">Active order</div>
            <div className="text-xs text-slate-500">Update status with one tap</div>
          </div>
          <OrderCard order={active} role="driver">
            {active.status === "PICKED" ? (
              <button
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white hover:bg-indigo-700 sm:w-auto"
                onClick={() => updateActiveStatus("ON_THE_WAY")}
              >
                Mark On The Way
              </button>
            ) : null}
            {active.status === "ON_THE_WAY" ? (
              <button
                className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white hover:bg-emerald-700 sm:w-auto"
                onClick={() => updateActiveStatus("DELIVERED")}
              >
                Mark Delivered
              </button>
            ) : null}
          </OrderCard>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="text-sm font-bold text-slate-900">No active order</div>
          <div className="mt-1 text-sm text-slate-600">Claim a ready order below.</div>
        </section>
      )}

      <section className="space-y-3">
        <div className="text-sm font-bold text-slate-900">Available READY orders</div>

        {!loading && available.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
            No ready orders right now. Keep this page open for live updates.
          </div>
        ) : (
          <div className="space-y-3">
            {available.map((o) => (
              <div key={o._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Order #{o._id.slice(-6)}</div>
                    <div className="mt-1 text-xs text-slate-500">Items: {itemsCount(o)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Deliver to: lng {o.deliveryLocation?.coordinates?.[0]}, lat {o.deliveryLocation?.coordinates?.[1]}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                    <div className="text-sm font-bold text-slate-900">₹{Math.round(o.totalPrice)}</div>
                    <button
                      className="w-full rounded-lg bg-slate-900 px-4 py-3 text-base font-semibold text-white hover:bg-slate-800 sm:w-auto"
                      onClick={() => claim(o._id)}
                      disabled={Boolean(active)}
                    >
                      Claim Order
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

