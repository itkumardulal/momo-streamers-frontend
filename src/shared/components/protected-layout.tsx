"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { selectAuth } from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { DashboardShell } from "./dashboard-shell";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAppSelector(selectAuth);

  useEffect(() => {
    if (!auth.rehydrated) return;
    if (!auth.token) router.replace("/login");
  }, [auth.rehydrated, auth.token, router, pathname]);

  if (!auth.rehydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-muted-foreground">Loading session…</p>
      </div>
    );
  }

  if (!auth.token) return null;

  return <DashboardShell>{children}</DashboardShell>;
}
