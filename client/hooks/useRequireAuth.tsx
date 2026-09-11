"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingBlock } from "@/components/ui/primitives";

/** Redirect guests to /login; render children only when authenticated. */
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  return { user, loading, ready: !loading && !!user };
}

export function AuthGate({ children, label }: { children: React.ReactNode; label?: string }) {
  const { ready, loading } = useRequireAuth();
  if (loading || !ready) return <LoadingBlock label={label} />;
  return <>{children}</>;
}
