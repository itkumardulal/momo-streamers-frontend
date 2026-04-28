"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import type { LoginResponse } from "@/entities/types";
import { useLoginMutation } from "@/features/api/apiSlice";
import {
  normalizeAuthRole,
  selectAuth,
  setCredentials,
} from "@/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const [login, { isLoading }] = useLoginMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (auth.rehydrated && auth.token) router.replace("/dashboard");
  }, [auth.rehydrated, auth.token, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const res = await login(values).unwrap();
      if (res.success && res.data) {
        const payload = res.data as LoginResponse & { Role?: string | number };
        const roleRaw = payload.role ?? payload.Role;
        const roleStr =
          typeof roleRaw === "number"
            ? String(roleRaw)
            : typeof roleRaw === "string"
              ? roleRaw
              : "";
        dispatch(
          setCredentials({
            userId: res.data.userId,
            token: res.data.token,
            email: res.data.email,
            role: normalizeAuthRole(roleStr) || roleStr,
            warehouseId: res.data.warehouseId ?? null,
            outletId: res.data.outletId ?? null,
          }),
        );
        toast.success("Signed in");
        router.replace("/dashboard");
        return;
      }
      toast.error(res.message ?? "Sign-in failed");
    } catch {
      toast.error("Unable to reach the server");
    }
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 px-4 py-10">
      <BrandLogo size={128} priority className="shadow-lg" />
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold text-foreground">
            Sign in
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            MO:MO STEAMERS — company account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@momo.com"
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-center text-sm">
              <Link
                href="/forgot-password"
                className="text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </p>
          </form>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            No public registration. Contact your administrator for access.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
