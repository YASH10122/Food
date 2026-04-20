import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Link } from "react-router-dom";
import OrderCard from "../components/OrderCard";
import type { Order, Restaurant } from "../types";

const API_ROOT = import.meta.env.VITE_API_URL as string;
const API_BASE_URL = `${API_ROOT}/api`;
const SOCKET_URL = API_ROOT;

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function parseOrdersPayload(data: unknown): Order[] {
  if (Array.isArray(data)) return data as Order[];
  if (data && typeof data === "object" && "orders" in data && Array.isArray((data as { orders: unknown }).orders)) {
    return (data as { orders: Order[] }).orders;
  }
  return [];
}

export default function ManagerDashboardPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"live" | "all">("live");

  const [createName, setCreateName] = useState("");
  const [createLng, setCreateLng] = useState("72.5714");
  const [createLat, setCreateLat] = useState("23.0225");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    axios
      .get(`${API_BASE_URL}/restaurant/my`, { headers: { ...authHeader() } })
      .then((res) => {
        if (!alive) return;
        const data = res.data as any;
        const r = (data?.restaurant ||
          data?.restaurants?.[0] ||
          (Array.isArray(data) ? data[0] : data)) as Restaurant | undefined;
        setRestaurant(r?._id ? r : null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load restaurant");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const fetchOrders = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!restaurant?._id) return;
      if (opts?.silent) setOrdersRefreshing(true);
      setError(null);
      try {
        const res = await axios.get(`${API_BASE_URL}/order/restaurant/${restaurant._id}`, {
          headers: { ...authHeader() },
        });
        setOrders(parseOrdersPayload(res.data));
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || "Failed to load orders");
      } finally {
        setOrdersRefreshing(false);
      }
    },
    [restaurant?._id]
  );

  useEffect(() => {
    if (!restaurant?._id) return;
    fetchOrders();
  }, [restaurant?._id, fetchOrders]);

  useEffect(() => {
    if (!restaurant?._id) return;
    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
    });
    const rid = restaurant._id;
    socket.on("newOrder", (o: Order) => {
      const oid = typeof o.restaurantId === "string" ? o.restaurantId : (o.restaurantId as any)?._id?.toString?.();
      if (oid && oid !== rid) return;
      setOrders((prev) => {
        if (prev.some((p) => p._id === o._id)) return prev;
        return [o, ...prev];
      });
    });
    socket.on("connect", () => fetchOrders({ silent: true }));
    return () => {
      socket.disconnect();
    };
  }, [restaurant?._id, fetchOrders]);

  useEffect(() => {
    if (!restaurant?._id) return;
    const t = window.setInterval(() => fetchOrders({ silent: true }), 12000);
    return () => window.clearInterval(t);
  }, [restaurant?._id, fetchOrders]);

  const liveOrders = useMemo(
    () => orders.filter((o) => ["PLACED", "ACCEPTED", "READY"].includes(o.status)),
    [orders]
  );
  const placed = useMemo(() => orders.filter((o) => o.status === "PLACED"), [orders]);
  const accepted = useMemo(() => orders.filter((o) => o.status === "ACCEPTED"), [orders]);
  const ready = useMemo(() => orders.filter((o) => o.status === "READY"), [orders]);

  const optimisticUpdate = (orderId: string, next: Order["status"]) => {
    setOrders((prev) =>
      prev.map((o) =>
        o._id === orderId
          ? {
              ...o,
              status: next,
              statusHistory: [...(o.statusHistory || []), { status: next, timestamp: new Date().toISOString() }],
            }
          : o
      )
    );
  };

  const patch = async (orderId: string, action: "accept" | "reject" | "ready", nextStatus: Order["status"]) => {
    optimisticUpdate(orderId, nextStatus);
    try {
      const res = await axios.patch(`${API_BASE_URL}/order/${orderId}/${action}`, {}, { headers: { ...authHeader() } });
      const updated = (res.data?.order || res.data) as Order;
      setOrders((prev) => prev.map((o) => (o._id === orderId ? updated : o)));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update order");
      // refresh this order from server if possible
      try {
        const res = await axios.get(`${API_BASE_URL}/order/${orderId}`, { headers: { ...authHeader() } });
        const fresh = (res.data?.order || res.data) as Order;
        setOrders((prev) => prev.map((o) => (o._id === orderId ? fresh : o)));
      } catch {
        // ignore
      }
    }
  };

  const onCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const body = { name: createName, coordinates: [Number(createLng), Number(createLat)] as [number, number] };
      const res = await axios.post(`${API_BASE_URL}/restaurant/Add`, body, { headers: { ...authHeader() } });
      const r = (res.data?.restaurant || res.data) as Restaurant;
      setRestaurant(r);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to create restaurant");
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Manager dashboard</h1>
          <p className="text-sm text-slate-600">Accept orders, mark them ready, and keep the queue moving.</p>
        </div>
        <Link className="text-sm font-semibold text-slate-900 underline" to="/manager/menu">
          Manage menu
        </Link>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {!restaurant ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-900">Create your restaurant</h2>
          <p className="mt-1 text-sm text-slate-600">You don’t have a restaurant yet.</p>
          <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" onSubmit={onCreateRestaurant}>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400 sm:col-span-3"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Restaurant name"
              required
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              value={createLng}
              onChange={(e) => setCreateLng(e.target.value)}
              placeholder="lng"
              required
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
              value={createLat}
              onChange={(e) => setCreateLat(e.target.value)}
              placeholder="lat"
              required
            />
            <button
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
              disabled={creating}
              type="submit"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">{restaurant.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  lng {restaurant.location?.coordinates?.[0]}, lat {restaurant.location?.coordinates?.[1]}
                </div>
                {ordersRefreshing ? (
                  <div className="mt-1 text-xs text-slate-400">Syncing orders…</div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    tab === "live" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                  onClick={() => setTab("live")}
                >
                  Live Orders
                </button>
                <button
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    tab === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                  }`}
                  onClick={() => setTab("all")}
                >
                  All Orders
                </button>
              </div>
            </div>
          </div>

          {tab === "live" ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <section className="space-y-3">
                <div className="text-sm font-bold text-slate-900">Placed</div>
                {placed.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    No placed orders.
                  </div>
                ) : (
                  placed.map((o) => (
                    <OrderCard key={o._id} order={o} role="manager">
                      <button
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        onClick={() => patch(o._id, "accept", "ACCEPTED")}
                      >
                        Accept
                      </button>
                      <button
                        className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        onClick={() => patch(o._id, "reject", "REJECTED")}
                      >
                        Reject
                      </button>
                    </OrderCard>
                  ))
                )}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-bold text-slate-900">Accepted</div>
                {accepted.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    No accepted orders.
                  </div>
                ) : (
                  accepted.map((o) => (
                    <OrderCard key={o._id} order={o} role="manager">
                      <button
                        className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                        onClick={() => patch(o._id, "ready", "READY")}
                      >
                        Mark Ready
                      </button>
                    </OrderCard>
                  ))
                )}
              </section>

              <section className="space-y-3">
                <div className="text-sm font-bold text-slate-900">Ready for pickup</div>
                {ready.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                    No orders ready yet.
                  </div>
                ) : (
                  ready.map((o) => (
                    <OrderCard key={o._id} order={o} role="manager">
                      <span className="text-xs text-slate-500">Waiting for a driver to claim.</span>
                    </OrderCard>
                  ))
                )}
              </section>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">No orders yet.</div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <OrderCard key={o._id} order={o} role="manager" />
              ))}
            </div>
          )}

          {tab === "live" && liveOrders.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              Live queue is empty.
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

