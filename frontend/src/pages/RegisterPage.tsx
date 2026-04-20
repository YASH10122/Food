import axios from "axios";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Role } from "../types";

const API_ROOT = import.meta.env.VITE_API_URL as string;
const API_BASE_URL = `${API_ROOT}/api`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/user/register`, { name, email, password, role });
      navigate("/login", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold text-slate-900">Register</h1>
      <p className="mt-1 text-sm text-slate-600">Create an account to start ordering or delivering.</p>

      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <div>
          <label className="text-sm font-semibold text-slate-700">Name</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Email</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Password</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-slate-700">Role</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="customer">customer</option>
            <option value="manager">manager</option>
            <option value="driver">driver</option>
          </select>
        </div>
        <button
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creating..." : "Register"}
        </button>
      </form>

      <div className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-semibold text-slate-900 underline" to="/login">
          Login
        </Link>
      </div>
    </div>
  );
}

