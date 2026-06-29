import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DEMO_PASSWORD } from "../data/demo";
import AuthLayout from "../components/AuthLayout";
import { Button, Field, TextInput } from "../components/ui";

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
  const [submitting, setSubmitting] = useState(false);

  async function submit(e, creds) {
    e?.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(creds?.email ?? email, creds?.password ?? password);
      navigate(HOME_BY_ROLE[user.role] || "/");
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  function quickFill(acc) {
    setEmail(acc.email);
    setPassword(DEMO_PASSWORD);
    submit(null, { email: acc.email, password: DEMO_PASSWORD });
  }

  return (
    <AuthLayout>
      <div className="mb-8 lg:hidden">
        {/* spacer for small screens; brand panel hidden */}
      </div>
      <h2 className="text-[26px] font-bold text-ink">Welcome back</h2>
      <p className="mt-1 text-[14px] text-muted">Sign in to continue to CrisisConnect.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <Field label="Email">
          <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </Field>
        <Field label="Password">
          <TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </Field>

        {error && <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-[13px] font-medium text-[#b3392e]">{error}</p>}

        <Button type="submit" size="lg" loading={submitting} className="w-full">Sign in</Button>
      </form>

      <div className="mt-7">
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span className="h-px flex-1 bg-line" />
          Try a demo account
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.role}
              onClick={() => quickFill(a)}
              disabled={submitting}
              className="rounded-xl bg-white px-2 py-2.5 text-[13px] font-semibold text-ink hairline transition hover:bg-line-soft focus-ring disabled:opacity-50"
            >
              {a.role}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">Password for all demo accounts: {DEMO_PASSWORD}</p>
      </div>

      <p className="mt-7 text-center text-[13px] text-muted">
        New here?{" "}
        <Link to="/register" className="font-semibold text-teal-600 hover:underline">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
