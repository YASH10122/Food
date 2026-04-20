import axios from "axios";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User } from "../types";

const API_ROOT = import.meta.env.VITE_API_URL as string;
const API_BASE_URL = `${API_ROOT}/api`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/user/login`, { email, password });
      const token = (res.data?.token || res.data?.accessToken) as string | undefined;
      const user = (res.data?.user ? res.data.user : res.data) as User | undefined;
      if (!token || !user?._id || !user?.role) throw new Error("Invalid login response");

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      window.dispatchEvent(new Event("authChanged"));

      if (user.role === "customer") navigate("/restaurants", { replace: true });
      else if (user.role === "manager") navigate("/manager/dashboard", { replace: true });
      else navigate("/driver/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold text-slate-900">Login</h1>
      <p className="mt-1 text-sm text-slate-600">Sign in to manage orders and dispatch.</p>

      {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
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
        <button
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-300"
          disabled={loading}
          type="submit"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>

      <div className="mt-4 text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link className="font-semibold text-slate-900 underline" to="/register">
          Register
        </Link>
      </div>
    </div>
  );
}

