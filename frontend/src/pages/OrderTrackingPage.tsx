import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import OrderCard from "../components/OrderCard";
import OrderRatingForm from "../components/OrderRatingForm";
import OrderStatusTimeline from "../components/OrderStatusTimeline";
import type { Order, OrderStatus } from "../types";

const API_ROOT = import.meta.env.VITE_API_URL as string;
const API_BASE_URL = `${API_ROOT}/api`;
const SOCKET_URL = API_ROOT;

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function etaText(status: OrderStatus) {
  if (status === "PICKED" || status === "ON_THE_WAY") return "Driver is on the way!";
  if (status === "DELIVERED") return "Order delivered!";
  if (status === "REJECTED") return "Order was rejected.";
  return "Preparing your order...";
}

export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const id = orderId || "";

  const [order, setOrder] = useState<Order | null>(null);
  const [driverCoord, setDriverCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<"connected" | "reconnecting" | "disconnected">("disconnected");
  const [mapError, setMapError] = useState(false);

  const fetchOrder = async () => {
    const res = await axios.get(`${API_BASE_URL}/order/${id}`, { headers: { ...authHeader() } });
    const o = (res.data?.order || res.data) as Order;
    setOrder(o);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchOrder()
      .then(() => {
        if (!alive) return;
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load order");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
    });

    const onConnect = () => {
      setSocketStatus("connected");
      socket.emit("joinOrder", id);
    };
    const onDisconnect = () => setSocketStatus("reconnecting");
    const onConnectError = () => setSocketStatus("reconnecting");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    socket.on("orderUpdated", (updated: Order) => {
      setOrder((prev) => (prev && prev._id === updated._id ? { ...prev, ...updated } : updated));
    });

    socket.on("driverLocation", (payload: any) => {
      const lat = payload?.location?.lat ?? payload?.lat;
      const lng = payload?.location?.lng ?? payload?.lng;
      if (typeof lat === "number" && typeof lng === "number") setDriverCoord({ lat, lng });
    });

    return () => {
      setSocketStatus("disconnected");
      socket.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (!id || socketStatus === "connected") return;
    const timer = window.setInterval(() => {
      fetchOrder().catch(() => {
        // keep silent during reconnecting fallback polling
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [id, socketStatus]);

  const statusBadge = useMemo(() => {
    const s = order?.status;
    if (!s) return "bg-slate-100 text-slate-700 border-slate-200";
    if (s === "DELIVERED") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (s === "REJECTED") return "bg-red-100 text-red-800 border-red-200";
    if (s === "ON_THE_WAY") return "bg-indigo-100 text-indigo-800 border-indigo-200";
    if (s === "READY") return "bg-purple-100 text-purple-800 border-purple-200";
    if (s === "ACCEPTED") return "bg-blue-100 text-blue-800 border-blue-200";
    if (s === "PLACED") return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-orange-100 text-orange-800 border-orange-200";
  }, [order?.status]);

  const mapCenter = useMemo(() => {
    if (driverCoord) return driverCoord;
    const coords = order?.deliveryLocation?.coordinates;
    if (!coords || coords.length < 2) return null;
    return { lng: coords[0], lat: coords[1] };
  }, [driverCoord, order?.deliveryLocation?.coordinates]);

  const mapEmbedUrl = useMemo(() => {
    if (!mapCenter) return "";
    const delta = 0.01;
    const left = mapCenter.lng - delta;
    const right = mapCenter.lng + delta;
    const top = mapCenter.lat + delta;
    const bottom = mapCenter.lat - delta;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${mapCenter.lat}%2C${mapCenter.lng}`;
  }, [mapCenter]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Order tracking</h1>
          <p className="text-sm text-slate-600">{order ? etaText(order.status) : "Loading status…"}</p>
        </div>
        {order ? (
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusBadge}`}>{order.status}</span>
        ) : null}
      </div>

      {socketStatus !== "connected" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Reconnecting to live updates…
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Loading…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : !order ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Order not found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <OrderCard order={order} role="customer" />
            <OrderRatingForm order={order} onUpdated={(o) => setOrder(o)} />
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Driver location</div>
              <div className="mt-1 text-sm text-slate-700">
                {driverCoord ? `Driver at ${driverCoord.lat.toFixed(5)}, ${driverCoord.lng.toFixed(5)}` : "Waiting for driver…"}
              </div>
              <div className="mt-2 text-xs text-slate-500">If tiles fail, we still show coordinates as text.</div>
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                {mapCenter && !mapError ? (
                  <iframe
                    title="Live order map"
                    src={mapEmbedUrl}
                    className="h-64 w-full"
                    loading="lazy"
                    onError={() => setMapError(true)}
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-slate-50 px-3 text-center text-sm text-slate-600">
                    Map unavailable right now. Live coordinates are still updating above.
                  </div>
                )}
              </div>
            </div>
          </div>

          <OrderStatusTimeline statusHistory={order.statusHistory || []} currentStatus={order.status} />
        </div>
      )}
    </div>
  );
}

