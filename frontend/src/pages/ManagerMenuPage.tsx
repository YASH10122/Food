import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MenuItem, Restaurant } from "../types";

const API_ROOT = import.meta.env.VITE_API_URL as string;
const API_BASE_URL = `${API_ROOT}/api`;

function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ManagerMenuPage() {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (!restaurant?._id) return;
    let alive = true;
    setError(null);
    axios
      .get(`${API_BASE_URL}/menuitem/${restaurant._id}`, { headers: { ...authHeader() } })
      .then((res) => {
        if (!alive) return;
        const list = (res.data?.menuItems || res.data?.items || res.data || []) as MenuItem[];
        setItems(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.message || err?.message || "Failed to load menu items");
      });
    return () => {
      alive = false;
    };
  }, [restaurant?._id]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name));
  }, [items]);

  const startEdit = (it: MenuItem) => {
    setEditingId(it._id);
    setEditName(it.name);
    setEditPrice(String(it.price));
    setEditCategory(it.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
    setEditCategory("");
  };

  const optimisticReplace = (id: string, patch: Partial<MenuItem>) => {
    setItems((prev) => prev.map((p) => (p._id === id ? { ...p, ...patch } : p)));
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant?._id) return;
    setAdding(true);
    setError(null);
    try {
      const body = { name, price: Number(price), category, restaurantId: restaurant._id };
      const res = await axios.post(`${API_BASE_URL}/menuitem/add`, body, { headers: { ...authHeader() } });
      const created = (res.data?.menuItem || res.data?.item || res.data) as MenuItem;
      setItems((prev) => [created, ...prev]);
      setName("");
      setPrice("");
      setCategory("");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to add item");
    } finally {
      setAdding(false);
    }
  };

  const onSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    const before = items.find((i) => i._id === editingId) || null;
    optimisticReplace(editingId, { name: editName, price: Number(editPrice), category: editCategory });
    try {
      const body = { name: editName, price: Number(editPrice), category: editCategory };
      const res = await axios.put(`${API_BASE_URL}/menuitem/${editingId}`, body, { headers: { ...authHeader() } });
      const updated = (res.data?.menuItem || res.data?.item || res.data) as MenuItem;
      setItems((prev) => prev.map((p) => (p._id === editingId ? updated : p)));
      cancelEdit();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to update item");
      if (before) setItems((prev) => prev.map((p) => (p._id === editingId ? before : p)));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    const before = items;
    setItems((prev) => prev.filter((p) => p._id !== id));
    setError(null);
    try {
      await axios.delete(`${API_BASE_URL}/menuitem/${id}`, { headers: { ...authHeader() } });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to delete item");
      setItems(before);
    }
  };

  const onToggleAvailability = async (it: MenuItem) => {
    const before = it.isAvailable;
    optimisticReplace(it._id, { isAvailable: !it.isAvailable });
    setError(null);
    try {
      const res = await axios.put(
        `${API_BASE_URL}/menuitem/${it._id}`,
        { isAvailable: !it.isAvailable },
        { headers: { ...authHeader() } }
      );
      const updated = (res.data?.menuItem || res.data?.item || res.data) as MenuItem;
      setItems((prev) => prev.map((p) => (p._id === it._id ? updated : p)));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to toggle availability");
      optimisticReplace(it._id, { isAvailable: before });
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">Loading…</div>;
  }

  if (!restaurant) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-semibold text-slate-900">No restaurant yet</div>
        <p className="mt-1 text-sm text-slate-600">Create your restaurant first.</p>
        <button
          className="mt-4 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={() => navigate("/manager/dashboard")}
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Menu</h1>
        <p className="text-sm text-slate-600">Add, edit, delete items and toggle availability.</p>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="text-sm font-bold text-slate-900">Add item</div>
        <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" onSubmit={onAdd}>
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400 sm:col-span-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            required
          />
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
            required
          />
          <button
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
            disabled={adding}
            type="submit"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </form>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">No menu items yet.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((it) => (
            <div key={it._id} className="rounded-2xl border border-slate-200 bg-white p-4">
              {editingId === it._id ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400 sm:col-span-3"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                  />
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="Price"
                  />
                  <input
                    className="rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="Category"
                  />
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
                      onClick={onSaveEdit}
                      disabled={saving}
                      type="button"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                    <button
                      className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                      onClick={cancelEdit}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-bold text-slate-900">{it.name}</div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {it.category}
                      </span>
                      <span className="text-xs text-slate-500">₹{it.price}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Availability: {it.isAvailable ? "Yes" : "No"}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        it.isAvailable ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                      }`}
                      onClick={() => onToggleAvailability(it)}
                      type="button"
                    >
                      Toggle availability
                    </button>
                    <button
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                      onClick={() => startEdit(it)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      onClick={() => onDelete(it._id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

