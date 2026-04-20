import type { MenuItem } from "../types";

export default function MenuItemCard({
  item,
  onAddToCart,
}: {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{item.name}</div>
          <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {item.category}
          </div>
        </div>
        <div className="text-sm font-bold text-slate-900">₹{item.price}</div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className={`text-xs font-semibold ${item.isAvailable ? "text-emerald-700" : "text-slate-400"}`}>
          {item.isAvailable ? "Available" : "Unavailable"}
        </span>
        <button
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={() => onAddToCart(item)}
          disabled={!item.isAvailable}
        >
          {item.isAvailable ? "Add to Cart" : "Unavailable"}
        </button>
      </div>
    </div>
  );
}

