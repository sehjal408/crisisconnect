import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ListChecks, HandHelping, House, TriangleAlert } from "lucide-react";
import { notifications as notifApi } from "../api/services";
import { timeAgo } from "../lib/meta";
import { cx } from "./ui";

// Icon + tint per notification type.
const TYPE = {
  request:    { icon: ListChecks,    color: "#16a394", bg: "#e8f6f4" },
  assignment: { icon: HandHelping,   color: "#2a6cc9", bg: "#e8f0fb" },
  shelter:    { icon: House,         color: "#16a394", bg: "#e8f6f4" },
  capacity:   { icon: TriangleAlert, color: "#d98a3d", bg: "#fbf1e3" },
  incident:   { icon: TriangleAlert, color: "#e0574b", bg: "#fdecea" },
};

// Sidebar notification bell: unread badge + dropdown panel. Polls every 30s.
export default function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  async function load() {
    try {
      const d = await notifApi.list();
      setItems(d.notifications || []);
      setUnread(d.unread || 0);
    } catch { /* keep last */ }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function readOne(n) {
    if (n.is_read) return;
    setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    notifApi.markRead(n.id).catch(() => {});
  }
  function readAll() {
    setItems((xs) => xs.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
    notifApi.markAllRead().catch(() => {});
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Notifications" aria-label="Notifications"
        className="relative grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-white/70 focus-ring">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#e0574b] px-1 text-[10px] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-2xl bg-white shadow-pop hairline">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-[13px] font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <button onClick={readAll} className="inline-flex items-center gap-1 text-[12px] font-semibold text-teal-600 hover:underline">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-muted">You're all caught up.</p>
            ) : items.map((n) => {
              const t = TYPE[n.type] || TYPE.request;
              const Icon = t.icon;
              return (
                <button key={n.id} onClick={() => readOne(n)}
                  className={cx("flex w-full items-start gap-3 border-b border-line-soft px-4 py-3 text-left transition hover:bg-line-soft/50", !n.is_read && "bg-teal-50/40")}>
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: t.bg, color: t.color }}>
                    <Icon size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-snug text-body">{n.message}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
