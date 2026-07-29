import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HandHelping, LifeBuoy, Loader2, ArrowRight, Car, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SKILLS, CERTIFICATIONS } from "../lib/meta";
import AuthLayout from "../components/AuthLayout";
import ChipSelect from "../components/ChipSelect";
import { cx } from "../components/ui";

const HOME_BY_ROLE = { citizen: "/map", volunteer: "/volunteer", admin: "/admin" };

const ROLES = [
  { value: "citizen", title: "Citizen", text: "Request assistance", icon: LifeBuoy },
  { value: "volunteer", title: "Volunteer", text: "Help respond", icon: HandHelping },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirm: "", role: "citizen",
    skills: [], certifications: [], vehicle_available: false,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));
  const isVolunteer = form.role === "volunteer";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, role: form.role,
      };
      if (isVolunteer) {
        payload.skills = form.skills;
        payload.certifications = form.certifications;
        payload.vehicle_available = form.vehicle_available;
      }
      const user = await register(payload);
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
                onClick={() => set("role", r.value)}
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-body">Password</label>
            <input className="auth-input" type="password" required value={form.password} onChange={update("password")} placeholder="At least 8 characters" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-body">Confirm password</label>
            <input className="auth-input" type="password" required value={form.confirm} onChange={update("confirm")} placeholder="Re-enter password" />
          </div>
        </div>

        {/* Volunteer-only profile */}
        {isVolunteer && (
          <div className="space-y-4 rounded-2xl bg-line-soft/60 p-4">
            <div>
              <label className="mb-2 block text-[12.5px] font-semibold text-body">What can you help with?</label>
              <ChipSelect options={SKILLS} value={form.skills} onChange={(v) => set("skills", v)} />
            </div>
            <div>
              <label className="mb-2 block text-[12.5px] font-semibold text-body">Certifications <span className="font-normal text-muted">(optional)</span></label>
              <ChipSelect options={CERTIFICATIONS} value={form.certifications} onChange={(v) => set("certifications", v)} />
            </div>
            <button
              type="button"
              onClick={() => set("vehicle_available", !form.vehicle_available)}
              className={cx(
                "flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all",
                form.vehicle_available ? "bg-teal-50 text-teal-600 ring-2 ring-teal" : "bg-white text-body hairline hover:bg-line-soft"
              )}
            >
              <Car size={16} /> I have a vehicle available for response
            </button>
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted">
              <ShieldCheck size={14} className="mt-[2px] shrink-0 text-teal-500" />
              Volunteer accounts are reviewed by an administrator before you can be assigned to tasks.
            </p>
          </div>
        )}

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
