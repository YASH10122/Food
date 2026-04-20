import type { OrderStatus } from "../types";

const FLOW: OrderStatus[] = ["PLACED", "ACCEPTED", "READY", "PICKED", "ON_THE_WAY", "DELIVERED"];

function label(s: OrderStatus) {
  if (s === "ON_THE_WAY") return "On the way";
  if (s === "DELIVERED") return "Delivered";
  if (s === "ACCEPTED") return "Accepted";
  if (s === "PLACED") return "Placed";
  if (s === "READY") return "Ready";
  if (s === "PICKED") return "Picked up";
  return s;
}

export default function OrderStatusTimeline({
  statusHistory,
  currentStatus,
}: {
  statusHistory: { status: OrderStatus; timestamp: string }[];
  currentStatus: OrderStatus;
}) {
  const byStatus = new Map(statusHistory.map((h) => [h.status, h.timestamp]));
  const rejected = currentStatus === "REJECTED" || byStatus.has("REJECTED");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Order status</h3>
      <ol className="space-y-3">
        {FLOW.map((s, idx) => {
          const ts = byStatus.get(s);
          const completed = Boolean(ts);
          const active = currentStatus === s;
          const dimmed = !completed && !active;

          return (
            <li key={s} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold",
                    completed
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : active
                        ? "border-slate-300 bg-slate-100 text-slate-800"
                        : "border-slate-200 bg-white text-slate-400",
                  ].join(" ")}
                  aria-label={completed ? "Completed" : active ? "Current" : "Pending"}
                >
                  {completed ? "✓" : idx + 1}
                </div>
                {idx !== FLOW.length - 1 ? (
                  <div className={`mt-1 h-6 w-px ${completed ? "bg-emerald-200" : "bg-slate-200"}`} />
                ) : null}
              </div>

              <div className="min-w-0">
                <div className={`text-sm font-semibold ${dimmed ? "text-slate-400" : "text-slate-900"}`}>
                  {label(s)}
                </div>
                <div className="text-xs text-slate-500">{ts ? new Date(ts).toLocaleString() : "—"}</div>
              </div>
            </li>
          );
        })}

        {rejected ? (
          <li className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-red-50 text-xs font-bold text-red-700">
                !
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-red-700">Rejected</div>
              <div className="text-xs text-slate-500">
                {byStatus.get("REJECTED") ? new Date(byStatus.get("REJECTED")!).toLocaleString() : "—"}
              </div>
            </div>
          </li>
        ) : null}
      </ol>
    </div>
  );
}

