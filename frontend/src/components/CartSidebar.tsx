import type { CartItem } from "../types";

export default function CartSidebar({
  cart,
  onRemove,
  onQuantityChange,
  onPlaceOrder,
  totalPrice,
  loading,
}: {
  cart: CartItem[];
  onRemove: (menuItemId: string) => void;
  onQuantityChange: (menuItemId: string, qty: number) => void;
  onPlaceOrder: () => void;
  totalPrice: number;
  loading: boolean;
}) {
  return (
    <aside className="w-full rounded-xl border border-slate-200 bg-white p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Your cart</h3>
        <span className="text-xs text-slate-500">{cart.length} item(s)</span>
      </div>

      {cart.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-600">
          Your cart is empty. Add something tasty.
        </div>
      ) : (
        <div className="space-y-3">
          {cart.map((ci) => (
            <div key={ci.menuItemId} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{ci.name}</div>
                  <div className="text-xs text-slate-500">
                    ₹{ci.price} × {ci.quantity}
                  </div>
                </div>
                <button
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                  onClick={() => onRemove(ci.menuItemId)}
                >
                  Remove
                </button>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <button
                  className="h-9 w-9 rounded-lg bg-slate-100 text-sm font-bold text-slate-800 hover:bg-slate-200"
                  onClick={() => onQuantityChange(ci.menuItemId, Math.max(1, ci.quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <div className="min-w-10 text-center text-sm font-semibold text-slate-900">{ci.quantity}</div>
                <button
                  className="h-9 w-9 rounded-lg bg-slate-100 text-sm font-bold text-slate-800 hover:bg-slate-200"
                  onClick={() => onQuantityChange(ci.menuItemId, ci.quantity + 1)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Total</span>
          <span className="text-sm font-bold text-slate-900">₹{Math.round(totalPrice)}</span>
        </div>
        <button
          className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={onPlaceOrder}
          disabled={loading || cart.length === 0}
        >
          {loading ? "Placing..." : "Place Order"}
        </button>
      </div>
    </aside>
  );
}

