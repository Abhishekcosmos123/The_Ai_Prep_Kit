"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function AppHeader() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login" || pathname === "/register") return null;

  const navLink = (href: string, label: string) => {
    const active = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`rounded-md px-2.5 py-1.5 text-sm transition ${
          active
            ? "bg-[var(--wash)] font-semibold text-[var(--ink)]"
            : "text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href={user ? "/dashboard" : "/"}
          className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)] sm:text-xl"
        >
          The AI Prep Kit
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {!loading && user ? (
            <>
              {navLink("/dashboard", "Kits")}
              {navLink("/kits/new", "New kit")}
              <span className="mx-1 hidden h-4 w-px bg-[var(--line)] sm:block" />
              <span className="hidden max-w-[10rem] truncate text-[var(--muted)] sm:inline">
                {user.name}
              </span>
              <button
                type="button"
                className="ui-btn ui-btn-secondary !px-3 !py-1.5"
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="ui-btn ui-btn-ghost !px-3 !py-1.5">
                Log in
              </Link>
              <Link href="/register" className="ui-btn ui-btn-primary !px-3 !py-1.5">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
