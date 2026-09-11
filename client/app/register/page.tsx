"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await register({ name, email, password });
      setUser(data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-10">
      <Link
        href="/"
        className="mb-8 font-[family-name:var(--font-display)] text-lg text-[var(--ink)]"
      >
        The AI Prep Kit
      </Link>
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
        Create your account
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        Already have one?{" "}
        <Link className="font-semibold text-[var(--accent)] hover:underline" href="/login">
          Log in
        </Link>
      </p>
      <form onSubmit={onSubmit} className="ui-panel mt-8 space-y-4 p-6">
        <label className="ui-label">
          Name
          <input
            className="ui-input mt-1.5"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="ui-label">
          Email
          <input
            className="ui-input mt-1.5"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="ui-label">
          Password
          <input
            className="ui-input mt-1.5"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="ui-help">At least 8 characters.</span>
        </label>
        {error ? <p className="text-sm text-[var(--warn)]">{error}</p> : null}
        <button type="submit" disabled={loading} className="ui-btn ui-btn-primary w-full !py-2.5">
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
