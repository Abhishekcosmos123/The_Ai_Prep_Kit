"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/auth";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/api";
import { Alert, Field, TextInput } from "@/components/ui/primitives";
import { IconEye, IconEyeOff, IconMark } from "@/components/ui/Icons";

type Mode = "login" | "register";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirm?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAuth(input: {
  mode: Mode;
  name: string;
  email: string;
  password: string;
  confirm: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  const email = input.email.trim();
  const name = input.name.trim();

  if (input.mode === "register") {
    if (!name) errors.name = "Name is required.";
    else if (name.length > 100) errors.name = "Name must be 100 characters or fewer.";
  }

  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  if (!input.password) errors.password = "Password is required.";
  else if (input.mode === "register") {
    if (input.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    } else if (!/[A-Za-z]/.test(input.password) || !/\d/.test(input.password)) {
      errors.password = "Use at least one letter and one number.";
    }
  }

  if (input.mode === "register") {
    if (!input.confirm) errors.confirm = "Confirm your password.";
    else if (input.confirm !== input.password) errors.confirm = "Passwords do not match.";
  }

  return errors;
}

function passwordStrength(password: string): { score: number; label: string } {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const label =
    score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : score === 4 ? "Strong" : "Excellent";
  return { score: Math.min(score, 4), label };
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isRegister = mode === "register";
  const strength = useMemo(() => passwordStrength(password), [password]);

  function markTouched(key: string) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  function runValidation(next?: Partial<{ name: string; email: string; password: string; confirm: string }>) {
    const errors = validateAuth({
      mode,
      name: next?.name ?? name,
      email: next?.email ?? email,
      password: next?.password ?? password,
      confirm: next?.confirm ?? confirm,
    });
    setFieldErrors(errors);
    return errors;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({
      name: true,
      email: true,
      password: true,
      confirm: true,
    });
    const errors = runValidation();
    if (Object.keys(errors).length) {
      setError("Fix the highlighted fields and try again.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = isRegister
        ? await register({ name: name.trim(), email: email.trim(), password })
        : await login({ email: email.trim(), password });
      setUser(data.user);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isRegister
            ? "Registration failed"
            : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <aside className="auth-brand-panel">
        <Link href="/" className="auth-brand-lockup">
          <span className="brand-mark">
            <IconMark size={18} />
          </span>
          <span>The AI Prep Kit</span>
        </Link>
        <div className="auth-brand-copy">
          <p className="auth-brand-kicker">Interview prep, researched</p>
          <h2 className="auth-brand-title">
            {isRegister
              ? "Build kits that start from the job — not a generic quiz bank."
              : "Welcome back. Your kits, coverage, and practice are waiting."}
          </h2>
          <ul className="auth-brand-points">
            <li>Company research + coverage-checked questions</li>
            <li>Edit, pin, and regenerate without losing your work</li>
            <li>Practice by confidence across flashcards</li>
          </ul>
        </div>
        <p className="auth-brand-foot">Free-tier friendly · Your kits stay private</p>
      </aside>

      <div className="auth-form-panel">
        <div className="auth-form-card ui-fade-up">
          <Link href="/" className="auth-mobile-brand">
            <span className="brand-mark">
              <IconMark size={16} />
            </span>
            The AI Prep Kit
          </Link>
          <h1 className="auth-form-title">
            {isRegister ? "Create your account" : "Sign in"}
          </h1>
          <p className="auth-form-lede">
            {isRegister ? "Already have an account?" : "New here?"}{" "}
            <Link href={isRegister ? "/login" : "/register"}>
              {isRegister ? "Log in" : "Create an account"}
            </Link>
          </p>

          <form onSubmit={onSubmit} className="auth-form" noValidate>
            {isRegister ? (
              <Field
                label="Name"
                htmlFor="auth-name"
                error={touched.name ? fieldErrors.name : undefined}
              >
                <TextInput
                  id="auth-name"
                  autoComplete="name"
                  value={name}
                  aria-invalid={touched.name && !!fieldErrors.name}
                  className={touched.name && fieldErrors.name ? "ui-input-invalid" : ""}
                  onBlur={() => {
                    markTouched("name");
                    runValidation();
                  }}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (touched.name) runValidation({ name: e.target.value });
                  }}
                />
              </Field>
            ) : null}

            <Field
              label="Email"
              htmlFor="auth-email"
              error={touched.email ? fieldErrors.email : undefined}
            >
              <TextInput
                id="auth-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                aria-invalid={touched.email && !!fieldErrors.email}
                className={touched.email && fieldErrors.email ? "ui-input-invalid" : ""}
                onBlur={() => {
                  markTouched("email");
                  runValidation();
                }}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (touched.email) runValidation({ email: e.target.value });
                }}
              />
            </Field>

            <Field
              label="Password"
              htmlFor="auth-password"
              error={touched.password ? fieldErrors.password : undefined}
              hint={
                isRegister && !fieldErrors.password
                  ? "At least 8 characters, with a letter and a number."
                  : undefined
              }
            >
              <div className="auth-password-wrap">
                <TextInput
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  value={password}
                  aria-invalid={touched.password && !!fieldErrors.password}
                  className={touched.password && fieldErrors.password ? "ui-input-invalid" : ""}
                  onBlur={() => {
                    markTouched("password");
                    runValidation();
                  }}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (touched.password || touched.confirm) {
                      runValidation({ password: e.target.value });
                    }
                  }}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
              {isRegister && password ? (
                <div className="auth-strength" aria-live="polite">
                  <div className="auth-strength-bars" data-score={strength.score}>
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>{strength.label}</span>
                </div>
              ) : null}
            </Field>

            {isRegister ? (
              <Field
                label="Confirm password"
                htmlFor="auth-confirm"
                error={touched.confirm ? fieldErrors.confirm : undefined}
              >
                <div className="auth-password-wrap">
                  <TextInput
                    id="auth-confirm"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirm}
                    aria-invalid={touched.confirm && !!fieldErrors.confirm}
                    className={touched.confirm && fieldErrors.confirm ? "ui-input-invalid" : ""}
                    onBlur={() => {
                      markTouched("confirm");
                      runValidation();
                    }}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      if (touched.confirm) runValidation({ confirm: e.target.value });
                    }}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </button>
                </div>
              </Field>
            ) : null}

            {error ? <Alert>{error}</Alert> : null}

            <button
              type="submit"
              disabled={loading}
              className="ui-btn ui-btn-primary ui-btn-glow w-full !py-3"
            >
              {loading
                ? isRegister
                  ? "Creating account…"
                  : "Signing in…"
                : isRegister
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
