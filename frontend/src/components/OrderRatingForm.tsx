import axios from "axios";
import { useState } from "react";
import type { Order } from "../types";

const API_ROOT = import.meta.env.VITE_API_URL as string;
const API_BASE_URL = `${API_ROOT}/api`;

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function StarRow({
  label,
  value,
  disabled,
  onPick,
}: {
  label: string;
  value: number | null;
  disabled: boolean;
  onPick: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold text-slate-700">{label}</div>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            className={`h-10 min-w-10 rounded-lg border px-2 text-sm font-bold transition ${
              value === n
                ? "border-amber-400 bg-amber-50 text-amber-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            onClick={() => onPick(n)}
          >
            {n}★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function OrderRatingForm({
  order,
  onUpdated,
}: {
  order: Order;
  onUpdated: (o: Order) => void;
}) {
  const [restaurantPick, setRestaurantPick] = useState<number | null>(null);
  const [driverPick, setDriverPick] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (order.status !== "DELIVERED") return null;

  const hasDriver = Boolean(order.driverId);
  const restaurantDone = order.restaurantRating != null;
  const driverDone = !hasDriver || order.driverRating != null;
  const allDone = restaurantDone && driverDone;

  const submitRestaurant = async () => {
    if (restaurantPick == null || restaurantDone) return;
    setSaving(true);
    setError(null);
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/order/${order._id}/rate`,
        { restaurantRating: restaurantPick },
        { headers: { ...authHeader() } }
      );
      const updated = (res.data?.order || res.data) as Order;
      onUpdated(updated);
      setRestaurantPick(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const submitDriver = async () => {
    if (driverPick == null || driverDone || !hasDriver) return;
    setSaving(true);
    setError(null);
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/order/${order._id}/rate`,
        { driverRating: driverPick },
        { headers: { ...authHeader() } }
      );
      const updated = (res.data?.order || res.data) as Order;
      onUpdated(updated);
      setDriverPick(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (allDone) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="text-sm font-semibold text-emerald-900">Your ratings</div>
        <div className="mt-2 text-sm text-emerald-800">
          Restaurant: {order.restaurantRating}★
          {hasDriver ? ` · Driver: ${order.driverRating}★` : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-900">Rate your experience</div>
      <p className="mt-1 text-xs text-slate-600">Stored on this order (1–5 stars). You can submit restaurant and driver separately.</p>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {!restaurantDone ? (
        <div className="mt-4 space-y-3">
          <StarRow label="Restaurant" value={restaurantPick} disabled={saving} onPick={setRestaurantPick} />
          <button
            type="button"
            disabled={saving || restaurantPick == null}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
            onClick={submitRestaurant}
          >
            Save restaurant rating
          </button>
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-700">
          Restaurant: <span className="font-semibold">{order.restaurantRating}★</span>
        </div>
      )}

      {hasDriver && !driverDone ? (
        <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
          <StarRow label="Driver" value={driverPick} disabled={saving} onPick={setDriverPick} />
          <button
            type="button"
            disabled={saving || driverPick == null}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
            onClick={submitDriver}
          >
            Save driver rating
          </button>
        </div>
      ) : hasDriver && driverDone ? (
        <div className="mt-3 text-sm text-slate-700">
          Driver: <span className="font-semibold">{order.driverRating}★</span>
        </div>
      ) : null}
    </div>
  );
}
