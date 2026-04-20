import axios from "axios";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Restaurant } from "../types";

const API_ROOT = import.meta.env.VITE_API_URL as string;
const API_BASE_URL = `${API_ROOT}/api`;

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function RestaurantListPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let alive = true;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!alive) return;
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        if (!alive) return;
        setCoords(null);
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

    const parseList = (data: any): Restaurant[] => {
      const list = (data?.restaurants || data || []) as Restaurant[];
      return Array.isArray(list) ? list : [];
    };

    const fetchRestaurants = async () => {
      try {
        // First request with geo filter (when available)
        if (coords) {
          const geoUrl = new URL(`${API_BASE_URL}/restaurant/`);
          geoUrl.searchParams.set("lng", String(coords.lng));
          geoUrl.searchParams.set("lat", String(coords.lat));
          const geoRes = await axios.get(geoUrl.toString(), { headers: { ...authHeader() } });
          const geoList = parseList(geoRes.data);

          // If nearby query returns empty, fallback to full list.
          if (geoList.length > 0) {
            if (!alive) return;
            setRestaurants(geoList);
            return;
          }
        }

        const allRes = await axios.get(`${API_BASE_URL}/restaurant/`, { headers: { ...authHeader() } });
        if (!alive) return;
        setRestaurants(parseList(allRes.data));
      } catch (err: any) {
        if (!alive) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load restaurants");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    fetchRestaurants();
    return () => {
      alive = false;
    };
  }, [coords]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Restaurants</h1>
          <p className="text-sm text-slate-600">Pick a place, add items, and track live dispatch.</p>
        </div>
        <Link className="text-sm font-semibold text-slate-900 underline" to="/orders">
          My orders
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Loading…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : restaurants.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          No restaurants found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <Link
              key={r._id}
              to={`/restaurant/${r._id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-300"
            >
              <div className="text-sm font-semibold text-slate-900">{r.name}</div>
              <div className="mt-2 text-xs text-slate-500">
                {r.location?.coordinates ? `lng ${r.location.coordinates[0]}, lat ${r.location.coordinates[1]}` : "—"}
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-900 underline">View menu</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

