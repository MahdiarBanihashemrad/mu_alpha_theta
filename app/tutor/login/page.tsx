"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, Glasses, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TutorLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const result = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok) throw new Error(result.error || "Could not sign in.");
      window.location.assign(result.redirectTo || "/tutor");
    } catch (loginError) { setError(loginError instanceof Error ? loginError.message : "Could not sign in."); }
    finally { setLoading(false); }
  }

  return (
    <main className="auth-shell">
      <Link href="/" className="auth-back"><ArrowLeft /> Student site</Link>
      <section className="auth-card">
        <div className="auth-brand"><span><Image src="/mu-alpha-theta-logo.png" alt="" width={48} height={48} unoptimized /></span><div><strong>Mu Alpha Theta</strong><small>Austin High</small></div></div>
        <span className="auth-icon"><Glasses /></span>
        <p className="card-kicker">Tutor View</p>
        <h1>Welcome back.</h1>
        <p>Sign in with the username and temporary or personal password connected to your tutor account.</p>
        <form onSubmit={submit}>
          <label htmlFor="username">Username</label>
          <Input id="username" autoComplete="username" placeholder="jordan.lee" value={username} onChange={(event) => setUsername(event.target.value)} />
          <label htmlFor="password">Password</label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <Button className="nav-cta" disabled={loading}>{loading ? "Signing in…" : <><LockKeyhole /> Sign in securely</>}</Button>
        </form>
        <small className="auth-help">Only approved Austin High Mu Alpha Theta tutors and officers can sign in.</small>
      </section>
    </main>
  );
}
