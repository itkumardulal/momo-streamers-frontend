"use client";

import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  normalizeAuthRole,
  selectCanViewMonthlyBusinessSheet,
  selectCanViewOutletStockRemovals,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";

export default function ReportsPage() {
  const roleNorm = normalizeAuthRole(useAppSelector((s) => s.auth.role));
  const canViewWarehouseStock =
    roleNorm === "SuperAdmin" || roleNorm === "WarehouseUser";
  const canViewOutletDailyStock = useAppSelector(selectCanViewOutletStockRemovals);
  const canViewMonthlySheet = useAppSelector(selectCanViewMonthlyBusinessSheet);
  const canViewAssetReports = roleNorm === "SuperAdmin";
  const canViewReportsHub =
    canViewWarehouseStock ||
    roleNorm === "OutletUser" ||
    canViewMonthlySheet ||
    canViewAssetReports;

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

  const hasAnyReportCard =
    canViewWarehouseStock ||
    canViewOutletDailyStock ||
    canViewMonthlySheet ||
    canViewAssetReports;

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Reports
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasAnyReportCard
          ? "Choose a report to open filters and results."
          : "No reports are available for your role."}
      </p>
      {hasAnyReportCard ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5">
          {canViewWarehouseStock ? (
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
                    Daily opening (including menu opening stock), production,
                    transfers to each outlet, damage, and closing by menu item
                    (UTC dates).
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ) : null}
          {canViewOutletDailyStock ? (
            <Link href="/reports/outlet-daily-stock-report" className="block h-full">
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <CardTitle className="text-base">
                    Outlet daily stock
                  </CardTitle>
                  <CardDescription>
                    Per outlet: menu stock (opening, transfers in, sold, damage,
                    staff, closing) and retail (purchases, sold, removals) by day
                    (UTC).
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ) : null}
          {canViewOutletDailyStock ? (
            <Link href="/reports/outlet-daily-sheet" className="block h-full">
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <CardTitle className="text-base">Outlet daily sheet</CardTitle>
                  <CardDescription>
                    One-day Excel-style view: cash and card collection, saleable
                    movement with sales value and COGS, expenses (Super Admin),
                    and net profit (UTC day).
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ) : null}
          {canViewMonthlySheet ? (
            <Link href="/reports/monthly-business-sheet" className="block h-full">
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <CardTitle className="text-base">
                    Monthly business sheet
                  </CardTitle>
                  <CardDescription>
                    P&L-style month view: POS revenue per outlet, warehouse and
                    outlet operating expenses, net profit and margin (pick
                    warehouse and month).
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ) : null}
          {canViewMonthlySheet ? (
            <Link href="/reports/outlet-performance" className="block h-full">
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <CardTitle className="text-base">Outlet performance</CardTitle>
                  <CardDescription>
                    Compare outlets by date range: daily, ISO week, month, or
                    year buckets; range summary and net profit matrix (same data
                    rules as monthly business sheet).
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ) : null}
          {canViewAssetReports ? (
            <Link href="/reports/assets-report" className="block h-full">
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <CardTitle className="text-base">Assets report</CardTitle>
                  <CardDescription>
                    Filter assets by category, status, and location; purchase
                    cost totals and printable inventory list.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ) : null}
          {canViewAssetReports ? (
            <Link
              href="/reports/asset-maintenance-report"
              className="block h-full"
            >
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <CardTitle className="text-base">
                    Asset maintenance report
                  </CardTitle>
                  <CardDescription>
                    Maintenance history by date range, asset, or category; cost
                    and expense totals with print.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
