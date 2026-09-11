"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  IconChart,
  IconKits,
  IconLogout,
  IconMark,
  IconPlus,
  IconVideo,
} from "@/components/ui/Icons";
import { initials } from "@/lib/format";

export function AppHeader() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/login" || pathname === "/register") return null;

  const kitsActive =
    pathname === "/dashboard" ||
    pathname === "/" ||
    pathname.startsWith("/kits/") ||
    pathname.startsWith("/practice/");

  const navItem = (opts: {
    href?: string;
    label: string;
    icon: ReactNode;
    active?: boolean;
    soon?: boolean;
  }) => {
    const className = `nav-link ${opts.active ? "nav-link-active" : ""} ${opts.soon ? "nav-link-soon" : ""}`;
    if (opts.soon || !opts.href) {
      return (
        <span className={className} title="Coming soon" aria-disabled="true">
          <span className="nav-link-icon">{opts.icon}</span>
          <span>{opts.label}</span>
        </span>
      );
    }
    return (
      <Link href={opts.href} className={className} aria-current={opts.active ? "page" : undefined}>
        <span className="nav-link-icon">{opts.icon}</span>
        <span>{opts.label}</span>
      </Link>
    );
  };

  return (
    <header className="app-header">
      <div className="app-header-inner">
        <Link href={user ? "/dashboard" : "/"} className="brand-lockup">
          <span className="brand-mark" aria-hidden>
            <IconMark size={20} />
          </span>
          <span className="brand-name">The AI Prep Kit</span>
        </Link>

        <nav className="app-nav" aria-label="Primary">
          {!loading && user ? (
            <>
              <div className="nav-cluster">
                {navItem({
                  href: "/dashboard",
                  label: "Kits",
                  icon: <IconKits size={16} />,
                  active: kitsActive && !pathname.startsWith("/kits/new"),
                })}
                {navItem({
                  label: "Analytics",
                  icon: <IconChart size={16} />,
                  soon: true,
                })}
                {navItem({
                  label: "Mock Interviews",
                  icon: <IconVideo size={16} />,
                  soon: true,
                })}
              </div>

              <div className="nav-actions">
                <Link href="/kits/new" className="ui-btn ui-btn-primary !rounded-xl !px-3.5 !py-2 !text-sm">
                  <IconPlus size={16} />
                  Create kit
                </Link>
                <div className="nav-user">
                  <div className="nav-avatar" title={user.name} aria-hidden>
                    {initials(user.name)}
                  </div>
                  <span className="nav-user-name">{user.name}</span>
                  <button
                    type="button"
                    className="nav-logout"
                    title="Log out"
                    aria-label="Log out"
                    onClick={async () => {
                      await logout();
                      router.push("/login");
                    }}
                  >
                    <IconLogout size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="nav-cluster">
              <Link href="/login" className="ui-btn ui-btn-ghost !px-3 !py-1.5">
                Log in
              </Link>
              <Link href="/register" className="ui-btn ui-btn-primary !px-3 !py-1.5">
                Sign up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
