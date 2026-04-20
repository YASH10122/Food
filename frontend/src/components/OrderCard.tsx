import type { Order, OrderStatus, Role } from "../types";

function statusColor(s: OrderStatus) {
  switch (s) {
    case "PLACED":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "ACCEPTED":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "READY":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "PICKED":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "ON_THE_WAY":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "DELIVERED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 border-red-200";
  }
}

export default function OrderCard({
  order,
  role,
  children,
  restaurantName,
}: {
  order: Order;
  role: Role;
  children?: React.ReactNode;
  restaurantName?: string;
}) {
  const shortId = order._id.slice(-6);
  const title =
    role === "customer"
      ? `Restaurant: ${restaurantName || order.restaurantId}`
      : role === "driver"
        ? `Restaurant: ${restaurantName || order.restaurantId}`
        : `Customer: ${order.customerId}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Order #{shortId}</div>
          <div className="mt-1 text-xs text-slate-500">{title}</div>
          <div className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColor(order.status)}`}>
            {order.status}
          </span>
          <span className="text-sm font-bold text-slate-900">₹{Math.round(order.totalPrice)}</span>
        </div>
      </div>

      {(role === "customer" || role === "manager") &&
      order.status === "DELIVERED" &&
      (order.restaurantRating != null || order.driverRating != null) ? (
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
          {order.restaurantRating != null ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-900">Restaurant {order.restaurantRating}★</span>
          ) : null}
          {order.driverRating != null ? (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-900">Driver {order.driverRating}★</span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3">
        <div className="text-xs font-semibold text-slate-700">Items</div>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {order.items.map((it) => (
            <li key={`${order._id}-${it.menuItemId}`} className="flex items-center justify-between gap-3">
              <span className="truncate">
                {it.name} <span className="text-slate-400">×</span> {it.quantity}
              </span>
              <span className="text-xs text-slate-500">₹{Math.round(it.price * it.quantity)}</span>
            </li>
          ))}
        </ul>
      </div>

      {children ? <div className="mt-4 flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

