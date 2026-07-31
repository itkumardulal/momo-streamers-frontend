"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AssetMaintenanceReport } from "@/entities/types";
import {
  useGetAssetCategoriesQuery,
  useGetAssetsQuery,
  useLazyGetAssetMaintenancesReportQuery,
} from "@/features/api/apiSlice";
import { selectIsSuperAdmin } from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { printAssetMaintenanceReport } from "@/lib/print-warehouse-document";
import { cn } from "@/lib/utils";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDay(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso;
  try {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const selectClass = cn(
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export default function AssetMaintenanceReportPage() {
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const defaultRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 30);
    return { from: ymd(from), to: ymd(to) };
  }, []);

  const { data: assetsRes } = useGetAssetsQuery(undefined, {
    skip: !isSuperAdmin,
  });
  const { data: catRes } = useGetAssetCategoriesQuery(undefined, {
    skip: !isSuperAdmin,
  });
  const assets = assetsRes?.success ? assetsRes.data ?? [] : [];
  const categories = catRes?.success ? catRes.data ?? [] : [];

  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [assetId, setAssetId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [report, setReport] = useState<AssetMaintenanceReport | null>(null);

  const [fetchReport, { isFetching }] =
    useLazyGetAssetMaintenancesReportQuery();

  const runReport = useCallback(async () => {
    if (!fromDate || !toDate) {
      toast.error("Choose from and to dates");
      return;
    }
    try {
      const res = await fetchReport({
        fromDate,
        toDate,
        ...(assetId ? { assetId } : {}),
        ...(categoryId ? { categoryId } : {}),
      }).unwrap();
      if (!res.success || !res.data) {
        toast.error(res.message ?? "Could not load report");
        setReport(null);
        return;
      }
      setReport(res.data);
    } catch {
      toast.error("Request failed");
      setReport(null);
    }
  }, [assetId, categoryId, fetchReport, fromDate, toDate]);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-lg rounded-xl border border-border bg-white p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          You do not have access to this report.
        </p>
        <Link
          href="/reports"
          className={cn(
            buttonVariants({ variant: "link", size: "sm" }),
            "mt-2 inline-flex h-auto px-0",
          )}
        >
          Back to reports
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/reports"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "mb-2 -ml-2 h-auto gap-1 px-2 text-muted-foreground",
            )}
          >
            <ArrowLeft className="size-3.5" />
            Reports
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            Asset maintenance report
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Repair and servicing history with cost and expense totals.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={!report}
          onClick={() => {
            if (report) printAssetMaintenanceReport(report);
          }}
        >
          <Printer className="size-4" />
          Print
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <Label htmlFor="amr-from">From</Label>
          <Input
            id="amr-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="amr-to">To</Label>
          <Input
            id="amr-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="amr-asset">Asset</Label>
          <select
            id="amr-asset"
            className={cn(selectClass, "w-52")}
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
          >
            <option value="">All assets</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="amr-cat">Category</Label>
          <select
            id="amr-cat"
            className={cn(selectClass, "w-48")}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" disabled={isFetching} onClick={() => runReport()}>
          {isFetching ? "Loading…" : "Run report"}
        </Button>
      </div>

      {report && (
        <>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{report.totalCount}</strong>{" "}
              records
            </span>
            <span>
              Total cost{" "}
              <strong className="text-foreground">
                {formatMoney(report.totalCost)}
              </strong>
            </span>
            <span>
              As expense{" "}
              <strong className="text-foreground">
                {report.expenseCount}
              </strong>{" "}
              ({formatMoney(report.expenseCostTotal)})
            </span>
          </div>
          <div className="rounded-lg border border-border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Expense</TableHead>
                  <TableHead>Expense item</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      No maintenance records in this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDay(row.maintenanceDate)}</TableCell>
                      <TableCell className="font-medium">
                        {row.assetName}
                      </TableCell>
                      <TableCell>{row.categoryName || "—"}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(row.cost)}
                      </TableCell>
                      <TableCell>
                        {row.recordAsExpense ? "Yes" : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.expenseItemName || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.outletName || row.warehouseName || "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {row.description || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
