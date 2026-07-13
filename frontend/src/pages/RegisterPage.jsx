import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HandHelping, LifeBuoy, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import { cx } from "../components/ui";

const HOME_BY_ROLE = { citizen: "/map", volunteer: "/volunteer", admin: "/admin" };

const ROLES = [
  { value: "citizen", title: "Citizen", text: "Request assistance", icon: LifeBuoy },
  { value: "volunteer", title: "Volunteer", text: "Help respond", icon: HandHelping },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "citizen" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await register(form);
      navigate(HOME_BY_ROLE[user.role] || "/");
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-600">
        Join the network
      </span>
      <h2 className="mt-3.5 text-[26px] font-bold leading-tight text-ink">Create your account</h2>
      <p className="mt-1 text-[13.5px] text-muted">Join CrisisConnect in under a minute.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          {ROLES.map((r) => {
            const active = form.role === r.value;
            const Icon = r.icon;
            return (
              <button
                type="button"
                key={r.value}
                onClick={() => setForm((f) => ({ ...f, role: r.value }))}
                className={cx(
                  "flex flex-col items-start gap-2 rounded-2xl p-3.5 text-left transition-all",
                  active ? "bg-teal-50 ring-2 ring-teal" : "bg-white hairline hover:bg-line-soft"
                )}
              >
                <Icon size={20} className={active ? "text-teal-600" : "text-muted"} />
                <div>
                  <p className="text-[13px] font-semibold text-ink">{r.title}</p>
                  <p className="text-[12px] text-muted">{r.text}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-body">Full name</label>
          <input className="auth-input" required value={form.name} onChange={update("name")} placeholder="Jane Doe" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-body">Email</label>
            <input className="auth-input" type="email" required value={form.email} onChange={update("email")} placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-body">Phone</label>
            <input className="auth-input" value={form.phone} onChange={update("phone")} placeholder="604-555-0100" />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-medium text-body">Password</label>
          <input className="auth-input" type="password" required value={form.password} onChange={update("password")} placeholder="Create a password" />
        </div>

        {error && (
          <p className="rounded-xl border border-[#f3c2bd] bg-[#fdecea] px-3 py-2 text-[13px] font-medium text-[#b3392e]">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-[#06121f] transition-all duration-200 focus-ring active:scale-[0.98] disabled:opacity-60"
          style={{ background: "linear-gradient(120deg,#2dd4bf,#16a394)", boxShadow: "0 14px 30px -14px rgba(22,163,148,.55)" }}
        >
          {submitting ? <Loader2 size={17} className="animate-spin" /> : <>Create account <ArrowRight size={17} /></>}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-teal-600 hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
