import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Check, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DEMO_PASSWORD } from "../data/demo";
import AuthLayout from "../components/AuthLayout";
import { cx } from "../components/ui";

const HOME_BY_ROLE = { citizen: "/map", volunteer: "/volunteer", admin: "/admin" };

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@crisisconnect.ca" },
  { role: "Volunteer", email: "volunteer@crisisconnect.ca" },
  { role: "Citizen", email: "citizen@crisisconnect.ca" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0); // re-keys the alert so a repeat error re-shakes
  const [status, setStatus] = useState("idle"); // idle | loading | success
  const busy = status !== "idle";

  async function submit(e, creds) {
    e?.preventDefault();
    setError("");
    setStatus("loading");
    try {
      const user = await login(creds?.email ?? email, creds?.password ?? password);
      // Success transition: show completion, let the card settle out, then hand off.
      setStatus("success");
      setTimeout(() => navigate(HOME_BY_ROLE[user.role] || "/"), 600);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || "Sign in failed");
      setErrorKey((k) => k + 1);
      setStatus("idle");
    }
  }

  function quickFill(acc) {
    setEmail(acc.email);
    setPassword(DEMO_PASSWORD);
    submit(null, { email: acc.email, password: DEMO_PASSWORD });
  }

  return (
    <AuthLayout leaving={status === "success"}>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-teal-600">
        <Lock size={11} strokeWidth={2.6} /> Secure access
      </span>
      <h2 className="mt-3.5 text-[26px] font-bold leading-tight text-ink">Welcome back</h2>
      <p className="mt-1 text-[13.5px] text-muted">Sign in to the CrisisConnect response network.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="auth-field">
          <label htmlFor="login-email" className="auth-label mb-1.5 block text-[12.5px] font-medium text-body">Email</label>
          <input
            id="login-email" className="auth-input" type="email" required autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email"
          />
        </div>
        <div className="auth-field">
          <label htmlFor="login-password" className="auth-label mb-1.5 block text-[12.5px] font-medium text-body">Password</label>
          <input
            id="login-password" className="auth-input" type="password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" autoComplete="current-password"
          />
        </div>

        {error && (
          <p
            key={errorKey}
            role="alert"
            className="animate-shake rounded-xl border border-[#f3c2bd] bg-[#fdecea] px-3 py-2 text-[13px] font-medium text-[#b3392e]"
          >
            {error}
          </p>
        )}

        {/* Primary action — hover lifts (affordance), press compresses (confirmation),
            loading keeps the label (progress without a layout jump), success shows
            a clear moment of completion before the page hands off. */}
        <button
          type="submit"
          disabled={busy}
          className={cx(
            "mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold focus-ring",
            "transition-all duration-200 active:scale-[0.97] disabled:cursor-default",
            status === "success" ? "text-white" : "text-[#06121f] hover:-translate-y-px hover:brightness-[1.04] disabled:opacity-80"
          )}
          style={
            status === "success"
              ? { background: "#2e9e6b", boxShadow: "0 14px 30px -14px rgba(46,158,107,.6)" }
              : { background: "linear-gradient(120deg,#2dd4bf,#16a394)", boxShadow: "0 14px 30px -14px rgba(22,163,148,.55)" }
          }
        >
          {status === "loading" && <><Loader2 size={17} className="animate-spin" /> Signing in…</>}
          {status === "success" && <><Check size={18} strokeWidth={3} className="animate-pop" /> Welcome</>}
          {status === "idle" && <>Sign in <ArrowRight size={17} /></>}
        </button>
      </form>

      <div className="mt-6">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted">
          <span className="h-px flex-1 bg-line" />
          Try a demo account
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.role}
              onClick={() => quickFill(a)}
              disabled={busy}
              className="rounded-xl border border-line bg-white px-2 py-2.5 text-[13px] font-semibold text-ink transition-all duration-150 hover:-translate-y-px hover:border-teal hover:bg-teal-50 focus-ring active:scale-[0.97] disabled:opacity-50"
            >
              {a.role}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">Password for all demo accounts: {DEMO_PASSWORD}</p>
      </div>

      <p className="mt-6 text-center text-[13px] text-muted">
        New here?{" "}
        <Link to="/register" className="font-semibold text-teal-600 hover:underline">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
