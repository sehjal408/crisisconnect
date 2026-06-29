import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HandHelping, LifeBuoy } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import { Button, Field, TextInput, cx } from "../components/ui";

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
      <h2 className="text-[26px] font-bold text-ink">Create your account</h2>
      <p className="mt-1 text-[14px] text-muted">Join CrisisConnect in under a minute.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-2">
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

        <Field label="Full name">
          <TextInput required value={form.name} onChange={update("name")} placeholder="Jane Doe" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <TextInput type="email" required value={form.email} onChange={update("email")} placeholder="you@example.com" />
          </Field>
          <Field label="Phone">
            <TextInput value={form.phone} onChange={update("phone")} placeholder="604-555-0100" />
          </Field>
        </div>
        <Field label="Password">
          <TextInput type="password" required value={form.password} onChange={update("password")} placeholder="Create a password" />
        </Field>

        {error && <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-[13px] font-medium text-[#b3392e]">{error}</p>}

        <Button type="submit" size="lg" loading={submitting} className="w-full">Create account</Button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-teal-600 hover:underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
