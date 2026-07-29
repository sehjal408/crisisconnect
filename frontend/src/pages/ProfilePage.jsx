import { useEffect, useState } from "react";
import { UserRound, KeyRound, Car, ShieldCheck, Check, BadgeCheck } from "lucide-react";
import { auth as authApi, volunteers as volApi } from "../api/services";
import { useAuth } from "../context/AuthContext";
import { SKILLS, CERTIFICATIONS, VERIFICATION_STATUS } from "../lib/meta";
import AppShell from "../components/AppShell";
import ChipSelect from "../components/ChipSelect";
import { Card, Button, Badge, Field, TextInput, Toggle, PageHeader, Spinner, cx } from "../components/ui";

const ROLE_LABEL = { citizen: "Citizen", volunteer: "Volunteer", admin: "Administrator" };

function Note({ tone = "good", children }) {
  const cls = tone === "good" ? "bg-[#e8f7ef] text-[#1f7a4d]" : "bg-[#fdecea] text-[#b3392e]";
  return <p className={cx("rounded-xl px-3 py-2 text-[12.5px] font-medium", cls)}>{children}</p>;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const isVolunteer = user?.role === "volunteer";

  // Account details
  const [acct, setAcct] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [savingAcct, setSavingAcct] = useState(false);
  const [acctMsg, setAcctMsg] = useState(null);

  // Password
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  // Volunteer profile
  const [vol, setVol] = useState(null);
  const [loadingVol, setLoadingVol] = useState(isVolunteer);
  const [savingVol, setSavingVol] = useState(false);
  const [volMsg, setVolMsg] = useState(null);

  useEffect(() => {
    if (!isVolunteer) return;
    volApi.me().then(setVol).finally(() => setLoadingVol(false));
  }, [isVolunteer]);

  async function saveAccount(e) {
    e.preventDefault();
    setAcctMsg(null);
    setSavingAcct(true);
    try {
      const updated = await authApi.updateProfile({ name: acct.name, phone: acct.phone });
      updateUser({ name: updated.name, phone: updated.phone });
      setAcctMsg({ tone: "good", text: "Account details saved." });
    } catch (err) {
      setAcctMsg({ tone: "bad", text: err.response?.data?.error?.message || "Could not save." });
    } finally {
      setSavingAcct(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.new_password.length < 8) return setPwMsg({ tone: "bad", text: "New password must be at least 8 characters." });
    if (pw.new_password !== pw.confirm) return setPwMsg({ tone: "bad", text: "New passwords do not match." });
    setSavingPw(true);
    try {
      await authApi.changePassword(pw.current_password, pw.new_password);
      setPw({ current_password: "", new_password: "", confirm: "" });
      setPwMsg({ tone: "good", text: "Password updated." });
    } catch (err) {
      setPwMsg({ tone: "bad", text: err.response?.data?.error?.message || "Could not update password." });
    } finally {
      setSavingPw(false);
    }
  }

  async function saveVolunteer(patch, msg) {
    setVolMsg(null);
    setSavingVol(true);
    try {
      const next = await volApi.updateMe(patch);
      setVol((v) => ({ ...v, ...next }));
      setVolMsg({ tone: "good", text: msg || "Profile saved." });
    } catch (err) {
      setVolMsg({ tone: "bad", text: err.response?.data?.error?.message || "Could not save." });
    } finally {
      setSavingVol(false);
    }
  }

  const vstatus = VERIFICATION_STATUS[vol?.verification_status] || VERIFICATION_STATUS.pending;

  return (
    <AppShell>
      <PageHeader eyebrow="Account" title="Your profile" subtitle="Manage your details, security, and how you show up in CrisisConnect." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account details */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-600"><UserRound size={18} /></span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Account details</h2>
              <p className="text-[12.5px] text-muted">{ROLE_LABEL[user?.role]}</p>
            </div>
          </div>
          <form onSubmit={saveAccount} className="space-y-4">
            <Field label="Full name">
              <TextInput value={acct.name} onChange={(e) => setAcct((a) => ({ ...a, name: e.target.value }))} required />
            </Field>
            <Field label="Email" hint="Email can't be changed — contact an administrator if needed.">
              <TextInput value={user?.email || ""} disabled className="opacity-70" />
            </Field>
            <Field label="Phone">
              <TextInput value={acct.phone} onChange={(e) => setAcct((a) => ({ ...a, phone: e.target.value }))} placeholder="604-555-0100" />
            </Field>
            {acctMsg && <Note tone={acctMsg.tone}>{acctMsg.text}</Note>}
            <Button type="submit" variant="accent" icon={Check} loading={savingAcct}>Save changes</Button>
          </form>
        </Card>

        {/* Password */}
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-600"><KeyRound size={18} /></span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Password</h2>
              <p className="text-[12.5px] text-muted">Change your sign-in password.</p>
            </div>
          </div>
          <form onSubmit={savePassword} className="space-y-4">
            <Field label="Current password">
              <TextInput type="password" value={pw.current_password} onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))} required />
            </Field>
            <Field label="New password">
              <TextInput type="password" value={pw.new_password} onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))} placeholder="At least 8 characters" required />
            </Field>
            <Field label="Confirm new password">
              <TextInput type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} required />
            </Field>
            {pwMsg && <Note tone={pwMsg.tone}>{pwMsg.text}</Note>}
            <Button type="submit" variant="accent" icon={KeyRound} loading={savingPw}>Update password</Button>
          </form>
        </Card>

        {/* Volunteer profile */}
        {isVolunteer && (
          <Card className="p-6 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-600"><BadgeCheck size={18} /></span>
                <div>
                  <h2 className="text-[15px] font-semibold text-ink">Volunteer profile</h2>
                  <p className="text-[12.5px] text-muted">Skills and certifications help admins match you to the right tasks.</p>
                </div>
              </div>
              <Badge tone={vstatus.tone} dot>{vstatus.label}</Badge>
            </div>

            {loadingVol ? (
              <Spinner label="Loading profile…" />
            ) : (
              <div className="space-y-5">
                {vol?.verification_status === "pending" && (
                  <p className="flex items-start gap-2 rounded-xl bg-[#fdf1e3] px-3.5 py-2.5 text-[12.5px] text-[#b06a1f]">
                    <ShieldCheck size={15} className="mt-[1px] shrink-0" />
                    Your account is awaiting administrator review. You'll be notified once verified and can then receive assignments.
                  </p>
                )}

                <div>
                  <label className="mb-2 block text-[12.5px] font-semibold text-body">Skills</label>
                  <ChipSelect options={SKILLS} value={vol?.skills || []} onChange={(v) => setVol((x) => ({ ...x, skills: v }))} />
                </div>
                <div>
                  <label className="mb-2 block text-[12.5px] font-semibold text-body">Certifications</label>
                  <ChipSelect options={CERTIFICATIONS} value={vol?.certifications || []} onChange={(v) => setVol((x) => ({ ...x, certifications: v }))} />
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <button
                    type="button"
                    onClick={() => setVol((x) => ({ ...x, vehicle_available: !x.vehicle_available }))}
                    className={cx(
                      "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all",
                      vol?.vehicle_available ? "bg-teal-50 text-teal-600 ring-2 ring-teal" : "bg-white text-body hairline hover:bg-line-soft"
                    )}
                  >
                    <Car size={16} /> Vehicle available
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-body">On duty</span>
                    <Toggle
                      checked={vol?.availability === "available"}
                      onChange={(on) => setVol((x) => ({ ...x, availability: on ? "available" : "unavailable" }))}
                    />
                  </div>
                </div>

                {volMsg && <Note tone={volMsg.tone}>{volMsg.text}</Note>}
                <Button
                  variant="accent"
                  icon={Check}
                  loading={savingVol}
                  onClick={() => saveVolunteer({
                    skills: vol.skills || [],
                    certifications: vol.certifications || [],
                    vehicle_available: !!vol.vehicle_available,
                    availability: vol.availability,
                  }, "Volunteer profile saved.")}
                >
                  Save volunteer profile
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}
