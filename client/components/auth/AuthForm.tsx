"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { Alert, Field, TextInput } from "@/components/ui/primitives";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = isRegister
        ? await register({ name, email, password })
        : await login({ email, password });
      setUser(data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : isRegister ? "Registration failed" : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[85vh] max-w-md flex-col justify-center px-4 py-10">
      <div
        className="pointer-events-none absolute inset-x-0 top-10 -z-10 mx-auto h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(15,107,76,0.35), transparent 70%)" }}
      />
      <Link href="/" className="mb-8 font-display text-lg font-bold tracking-tight">
        The AI Prep Kit
      </Link>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        {isRegister ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-2 text-[var(--muted)]">
        {isRegister ? "Already have one?" : "New here?"}{" "}
        <Link
          className="font-semibold text-[var(--accent)] hover:underline"
          href={isRegister ? "/login" : "/register"}
        >
          {isRegister ? "Log in" : "Create an account"}
        </Link>
      </p>
      <form onSubmit={onSubmit} className="ui-panel mt-8 space-y-4 p-6 ui-fade-up">
        {isRegister ? (
          <Field label="Name">
            <TextInput required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        ) : null}
        <Field label="Email">
          <TextInput
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password" hint={isRegister ? "At least 8 characters." : undefined}>
          <TextInput
            type="password"
            required
            minLength={isRegister ? 8 : undefined}
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <button type="submit" disabled={loading} className="ui-btn ui-btn-primary w-full !py-2.5">
          {loading ? (isRegister ? "Creating…" : "Signing in…") : isRegister ? "Create account" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
