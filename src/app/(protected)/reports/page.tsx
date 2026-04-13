"use client";

import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { normalizeAuthRole, selectAuth } from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";

export default function ReportsPage() {
  const auth = useAppSelector(selectAuth);
  const roleNorm = normalizeAuthRole(auth.role);
  const canViewWarehouseStock =
    roleNorm === "SuperAdmin" || roleNorm === "WarehouseUser";
  const canViewReportsHub =
    canViewWarehouseStock || roleNorm === "OutletUser";

  if (!canViewReportsHub) {
    return (
      <div className="max-w-lg rounded-xl border border-border bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Reports</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have access to reports.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Reports
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {canViewWarehouseStock
          ? "Choose a report to open filters and results."
          : "Outlet-specific reports are not available yet. For warehouse-wide stock, ask your warehouse manager."}
      </p>
      {canViewWarehouseStock ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/reports/warehouse-stock-report" className="block h-full">
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileSpreadsheet className="size-5" />
                </div>
                <CardTitle className="text-base">
                  Warehouse stock report
                </CardTitle>
                <CardDescription>
                  Daily opening, production, transfers to each outlet, damage,
                  and closing stock by menu item (UTC dates).
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
