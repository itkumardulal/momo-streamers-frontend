"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { BrandLogo } from "@/components/brand-logo";
import {
  useForgotPasswordMutation,
  useResetPasswordWithOtpMutation,
} from "@/features/api/apiSlice";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const resetSchema = z
  .object({
    otp: z
      .string()
      .length(6, "Enter the 6-digit code")
      .regex(/^\d{6}$/, "Digits only"),
    password: z.string().min(6).max(100),
    confirm: z.string().min(1),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type EmailForm = z.infer<typeof emailSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [savedEmail, setSavedEmail] = useState("");

  const [forgotPassword, { isLoading: sending }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: resetting }] =
    useResetPasswordWithOtpMutation();

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const resetForm = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: "", password: "", confirm: "" },
  });

  const onEmail = emailForm.handleSubmit(async (values) => {
    try {
      const res = await forgotPassword({ email: values.email.trim() }).unwrap();
      if (res.success) {
        toast.message(res.message ?? "Check your email");
        setSavedEmail(values.email.trim());
        setStep("reset");
        return;
      }
      toast.error(res.message ?? "Request failed");
    } catch {
      toast.error("Unable to reach the server");
    }
  });

  const onReset = resetForm.handleSubmit(async (values) => {
    try {
      const res = await resetPassword({
        email: savedEmail,
        otp: values.otp.trim(),
        newPassword: values.password,
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Password updated");
        router.replace("/login");
        return;
      }
      toast.error(res.message ?? "Could not reset password");
    } catch {
      toast.error("Request failed");
    }
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-slate-50 px-4 py-10">
      <BrandLogo size={128} priority className="shadow-lg" />
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold text-foreground">
            {step === "email" ? "Forgot password" : "Verify and reset"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {step === "email"
              ? "We will email you a 6-digit code or a setup link."
              : `If the email contains a link to set your password, open that link and skip this form. Otherwise enter the 6-digit code sent to ${savedEmail} and choose a new password.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={onEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fp-email">Email</Label>
                <Input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  {...emailForm.register("email")}
                />
                {emailForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={sending}>
                {sending ? "Sending…" : "Continue"}
              </Button>
            </form>
          ) : (
            <form onSubmit={onReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fp-otp">6-digit code</Label>
                <Input
                  id="fp-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  {...resetForm.register("otp")}
                />
                {resetForm.formState.errors.otp && (
                  <p className="text-xs text-destructive">
                    {resetForm.formState.errors.otp.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fp-np">New password</Label>
                <Input
                  id="fp-np"
                  type="password"
                  autoComplete="new-password"
                  {...resetForm.register("password")}
                />
                {resetForm.formState.errors.password && (
                  <p className="text-xs text-destructive">
                    {resetForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fp-npc">Confirm password</Label>
                <Input
                  id="fp-npc"
                  type="password"
                  autoComplete="new-password"
                  {...resetForm.register("confirm")}
                />
                {resetForm.formState.errors.confirm && (
                  <p className="text-xs text-destructive">
                    {resetForm.formState.errors.confirm.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={resetting}>
                {resetting ? "Saving…" : "Reset password"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("email");
                  resetForm.reset();
                }}
              >
                Use a different email
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
