import { ProtectedLayout } from "@/shared/components/protected-layout";

export default function ProtectedRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
