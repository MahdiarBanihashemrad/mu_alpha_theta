"use client";

import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ChangePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) return setError("The passwords do not match.");
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not update your password.");
      window.location.assign("/tutor");
    } catch (changeError) { setError(changeError instanceof Error ? changeError.message : "Could not update your password."); }
    finally { setLoading(false); }
  }

  return (
    <main className="auth-shell"><section className="auth-card password-card">
      <span className="auth-icon"><KeyRound /></span><p className="card-kicker">First sign-in</p><h1>Create your password.</h1>
      <p>Replace the temporary password with one only you know.</p>
      <form onSubmit={submit}>
        <label htmlFor="new-password">New password</label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <label htmlFor="confirm-password">Confirm password</label><Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        <p className="password-rules">10+ characters with uppercase, lowercase, a number, and a symbol.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button className="nav-cta" disabled={loading}>{loading ? "Saving…" : "Save password"}</Button>
      </form>
    </section></main>
  );
}
