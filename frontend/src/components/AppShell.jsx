import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Map, ListChecks, LayoutDashboard, Building2, TriangleAlert, LogOut, HandHelping,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { isDemo } from "../api/services";
import { Logo, cx } from "./ui";

const NAV = {
  citizen: [
    { to: "/map", label: "Crisis map", icon: Map },
    { to: "/requests", label: "My requests", icon: ListChecks },
  ],
  volunteer: [{ to: "/volunteer", label: "My dashboard", icon: HandHelping }],
  admin: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/requests", label: "Request queue", icon: ListChecks },
    { to: "/admin/shelters", label: "Shelters", icon: Building2 },
    { to: "/admin/incidents", label: "Incidents", icon: TriangleAlert },
  ],
};

const ROLE_LABEL = { citizen: "Citizen", volunteer: "Volunteer", admin: "Administrator" };

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();
  const links = NAV[user?.role] || [];
  const initials = (user?.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("");

  return (
    <div className="min-h-screen md:flex">
      <div className="app-aurora" aria-hidden="true" />

      {/* Sidebar */}
      <aside className="glass sticky top-0 z-20 hidden h-screen w-[248px] shrink-0 flex-col border-r border-line px-4 py-5 md:flex">
        <div className="px-2">
          <Logo />
        </div>

        <nav className="mt-7 flex-1 space-y-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Menu</p>
          {links.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active ? "bg-white text-ink shadow-soft" : "text-body hover:bg-white/70"
                )}
              >
                <Icon size={18} className={active ? "text-teal-600" : "text-muted"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {isDemo && (
          <div className="mb-3 rounded-xl bg-teal-50 px-3 py-2.5 text-[12px] leading-snug text-teal-600">
            <span className="font-semibold">Demo mode</span> — running on seeded sample data.
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 hairline">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-navy-700 text-[13px] font-semibold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-[11px] text-muted">{ROLE_LABEL[user?.role]}</p>
          </div>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-line-soft hover:text-ink focus-ring"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-20 flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
        <Logo />
        <button onClick={() => { logout(); navigate("/login"); }} className="text-sm text-muted">
          Sign out
        </button>
      </header>

      {/* Content */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-5 py-7 md:px-10 md:py-10 animate-fade">{children}</div>
      </main>
    </div>
  );
}
