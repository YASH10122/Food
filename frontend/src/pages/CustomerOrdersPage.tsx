import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrderCard from "../components/OrderCard";
import type { Order } from "../types";

const API_ROOT = import.meta.env.VITE_API_URL as string;
const API_BASE_URL = `${API_ROOT}/api`;

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function CustomerOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    axios
      .get(`${API_BASE_URL}/order/my`, { headers: { ...authHeader() } })
      .then((res) => {
        if (!alive) return;
        const list = (res.data?.orders || res.data || []) as Order[];
        setOrders(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load orders");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-900">My orders</h1>
        <p className="text-sm text-slate-600">Track current orders and revisit past ones.</p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Loading…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          No orders yet. Place your first order from the restaurants list.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <OrderCard key={o._id} order={o} role="customer">
              <button
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={() => navigate(`/order/${o._id}/track`)}
              >
                Track Order
              </button>
            </OrderCard>
          ))}
        </div>
      )}
    </div>
  );
}

