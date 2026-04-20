import { Link, useNavigate } from "react-router-dom";
import type { User } from "../types";

export default function Navbar({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  const navigate = useNavigate();

  const badgeClass =
    user?.role === "customer"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : user?.role === "manager"
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : "bg-green-100 text-green-700 border-green-200";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <button
          className="flex items-center gap-2 font-semibold text-slate-900"
          onClick={() => navigate("/")}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            FD
          </span>
          <span>Food Dispatch</span>
        </button>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">Hi, {user.name}</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                {user.role.toUpperCase()}
              </span>
              <button
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                onClick={onLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link className="text-sm font-semibold text-slate-700 hover:text-slate-900" to="/login">
                Login
              </Link>
              <Link
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                to="/register"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

