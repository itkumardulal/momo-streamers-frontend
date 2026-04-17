"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetWarehousesQuery,
  useLazyGetPerOutletPerformanceQuery,
} from "@/features/api/apiSlice";
import {
  selectAuthWarehouseId,
  selectCanViewMonthlyBusinessSheet,
  selectIsSuperAdmin,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { printPerOutletPerformance } from "@/lib/print-warehouse-document";
import { cn } from "@/lib/utils";
import type {
  PerOutletPerformanceGranularity,
  PerOutletPerformanceReport,
} from "@/entities/types";

function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, mo, da] = s.split("-").map(Number);
  const d = new Date(y, mo - 1, da);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
  return d;
}

function daysInclusive(fromStr: string, toStr: string): number | null {
  const a = parseYmd(fromStr);
  const b = parseYmd(toStr);
  if (!a || !b) return null;
  const ms = 86400000;
  return Math.floor((b.getTime() - a.getTime()) / ms) + 1;
}

function yearsInclusive(fromStr: string, toStr: string): number | null {
  const a = parseYmd(fromStr);
  const b = parseYmd(toStr);
  if (!a || !b) return null;
  return b.getFullYear() - a.getFullYear() + 1;
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMarginPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${formatMoney(n)}%`;
}

function detailSubtitle(g: PerOutletPerformanceGranularity) {
  switch (g) {
    case "daily":
      return "day";
    case "weekly":
      return "week (ISO 8601)";
    case "monthly":
      return "month";
    case "yearly":
      return "calendar year";
    default:
      return "period";
  }
}

const GRANULARITY_OPTIONS: { value: PerOutletPerformanceGranularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function OutletPerformancePage() {
  const canView = useAppSelector(selectCanViewMonthlyBusinessSheet);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const userWarehouseId = useAppSelector(selectAuthWarehouseId);

  const { data: warehousesRes } = useGetWarehousesQuery(undefined, {
    skip: !canView,
  });
  const warehouses = useMemo(
    () => (warehousesRes?.success ? warehousesRes.data ?? [] : []),
    [warehousesRes],
  );

  const defaultRange = useMemo(() => {
    const y = new Date().getFullYear();
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }, []);

  const [warehouseId, setWarehouseId] = useState("");
  const [granularity, setGranularity] =
    useState<PerOutletPerformanceGranularity>("monthly");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [report, setReport] = useState<PerOutletPerformanceReport | null>(null);

  const [fetchReport, { isFetching }] = useLazyGetPerOutletPerformanceQuery();

  useEffect(() => {
    if (!isSuperAdmin || warehouseId || warehouses.length === 0) return;
    setWarehouseId(warehouses[0].id);
  }, [isSuperAdmin, warehouseId, warehouses]);

  const effectiveWarehouseId = isSuperAdmin ? warehouseId : userWarehouseId ?? "";

  const applyPreset = useCallback(
    (key: "thisYear" | "thisMonth" | "last30") => {
      const today = new Date();
      if (key === "thisYear") {
        const y = today.getFullYear();
        setFromDate(`${y}-01-01`);
        setToDate(`${y}-12-31`);
        setGranularity("monthly");
      } else if (key === "thisMonth") {
        const y = today.getFullYear();
        const m = today.getMonth();
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);
        setFromDate(ymdLocal(start));
        setToDate(ymdLocal(end));
        setGranularity("daily");
      } else {
        const end = new Date(today);
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        setFromDate(ymdLocal(start));
        setToDate(ymdLocal(end));
        setGranularity("daily");
      }
    },
    [],
  );

  const validateRange = useCallback(() => {
    const spanDays = daysInclusive(fromDate, toDate);
    if (spanDays === null || spanDays < 1) {
      toast.error("Enter valid from and to dates (yyyy-MM-dd).");
      return false;
    }
    if (fromDate > toDate) {
      toast.error("From date must be on or before to date.");
      return false;
    }
    const spanYears = yearsInclusive(fromDate, toDate);
    if (granularity === "daily" && spanDays > 92) {
      toast.error("Daily view: range must be at most 92 days.");
      return false;
    }
    if (granularity === "weekly" && spanDays > 731) {
      toast.error("Weekly view: range must be at most 731 days.");
      return false;
    }
    if (granularity === "monthly" && spanDays > 1096) {
      toast.error("Monthly view: range must be at most 1096 days.");
      return false;
    }
    if (granularity === "yearly" && (spanYears === null || spanYears > 20)) {
      toast.error("Yearly view: year span must be at most 20 years.");
      return false;
    }
    return true;
  }, [fromDate, toDate, granularity]);

  const runReport = useCallback(async () => {
    if (!validateRange()) return;
    if (!effectiveWarehouseId) {
      toast.error("Select a warehouse");
      return;
    }
    try {
      const res = await fetchReport({
        warehouseId: effectiveWarehouseId,
        granularity,
        fromDate,
        toDate,
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
  }, [effectiveWarehouseId, fetchReport, fromDate, granularity, toDate, validateRange]);

  const selectClass = cn(
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  const onPrint = () => {
    if (!report) {
      toast.error("Load the report first");
      return;
    }
    if (!printPerOutletPerformance(report)) {
      toast.error("Pop-up blocked — allow pop-ups to print");
    }
  };

  const outlets = report?.outlets ?? [];

  const periodTotals = useMemo(() => {
    if (!report?.periods?.length || !report.outlets.length) return null;
    const o = report.outlets;
    const outletTotals = o.map((_, i) =>
      report.periods.reduce((s, p) => s + (p.outletNetProfit[i] ?? 0), 0),
    );
    const whTotal = report.periods.reduce((s, p) => s + p.warehouseNetProfit, 0);
    const bizTotal = report.periods.reduce((s, p) => s + p.totalBusinessNetProfit, 0);
    return { outletTotals, whTotal, bizTotal };
  }, [report]);

  if (!canView) {
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
    <div className="mx-auto max-w-[120rem] space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/reports"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "inline-flex gap-1.5 -ml-2",
          )}
        >
          <ArrowLeft className="size-4" />
          Reports
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Outlet performance comparison
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare outlets by day, ISO week, month, or calendar year. Sales are
          grouped by UTC calendar date of POS timestamps; expenses use each
          entry&apos;s expense date (same rules as the monthly business sheet).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
        {isSuperAdmin ? (
          <div className="grid min-w-[12rem] gap-1.5">
            <Label htmlFor="op-wh">Warehouse</Label>
            <select
              id="op-wh"
              className={selectClass}
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">Select warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid min-w-[10rem] gap-1.5">
          <Label htmlFor="op-gran">Granularity</Label>
          <select
            id="op-gran"
            className={selectClass}
            value={granularity}
            onChange={(e) =>
              setGranularity(e.target.value as PerOutletPerformanceGranularity)
            }
          >
            {GRANULARITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="op-from">From</Label>
          <Input
            id="op-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[11rem]"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="op-to">To</Label>
          <Input
            id="op-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-[11rem]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("thisYear")}>
            This year
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("thisMonth")}>
            This month
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => applyPreset("last30")}>
            Last 30 days
          </Button>
        </div>
        <Button type="button" onClick={() => void runReport()} disabled={isFetching}>
          {isFetching ? "Loading…" : "Load report"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onPrint}
          disabled={!report}
          className="inline-flex gap-2"
        >
          <Printer className="size-4" />
          Print
        </Button>
      </div>

      {report && (
        <div className="space-y-10">
          <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
            <div className="border-b border-border bg-[#2f5597] px-4 py-3 text-white">
              <p className="text-sm font-medium opacity-90">
                {report.fromDate} — {report.toDate} ({report.granularity})
              </p>
              <p className="text-lg font-semibold tracking-tight">
                {report.warehouseName} — Range summary
              </p>
            </div>
            <p className="border-b border-border bg-slate-100 px-4 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Avg net / period divides range net by the number of rows in the detail
              table below.
            </p>
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="sticky left-0 z-10 border-b border-teal-700 bg-teal-600 px-3 py-2 text-left font-semibold">
                    Entity
                  </th>
                  <th className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums">
                    Range revenue
                  </th>
                  <th className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums">
                    Range expenses
                  </th>
                  <th className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums">
                    Range net profit
                  </th>
                  <th className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums">
                    Profit margin %
                  </th>
                  <th className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums">
                    Avg net / period
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.rangeSummary.map((row, ri) => (
                  <tr
                    key={`${row.kind}-${row.outletId ?? row.entityName}-${ri}`}
                    className={cn(
                      row.kind === "total"
                        ? "bg-slate-200/90 font-semibold dark:bg-slate-800/80"
                        : ri % 2 === 0
                          ? "bg-slate-50/80 dark:bg-slate-900/40"
                          : "",
                    )}
                  >
                    <td
                      className={cn(
                        "sticky left-0 z-10 border-b border-border px-3 py-2 font-medium",
                        row.kind === "total"
                          ? "bg-slate-200/90 dark:bg-slate-800/80"
                          : ri % 2 === 0
                            ? "bg-slate-50/80 dark:bg-slate-900/40"
                            : "bg-white dark:bg-background",
                      )}
                    >
                      {row.entityName}
                    </td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">
                      {formatMoney(row.rangeRevenue)}
                    </td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">
                      {formatMoney(row.rangeExpenses)}
                    </td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">
                      {formatMoney(row.rangeNetProfit)}
                    </td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">
                      {formatMarginPct(row.profitMarginPercent)}
                    </td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">
                      {formatMoney(row.avgNetPerPeriod)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
            <div className="border-b border-border bg-[#2f5597] px-4 py-3 text-white">
              <p className="text-lg font-semibold tracking-tight">
                Net profit by {detailSubtitle(report.granularity)}
              </p>
            </div>
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="sticky left-0 z-10 border-b border-teal-700 bg-teal-600 px-3 py-2 text-left font-semibold">
                    Period
                  </th>
                  {outlets.map((o) => (
                    <th
                      key={o.id}
                      className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums whitespace-nowrap"
                    >
                      {o.name} (net)
                    </th>
                  ))}
                  <th className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums">
                    Warehouse net
                  </th>
                  <th className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums">
                    Total business net
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.periods.map((p, pi) => (
                  <tr
                    key={p.periodKey}
                    className={pi % 2 === 0 ? "bg-slate-50/80 dark:bg-slate-900/40" : ""}
                  >
                    <td
                      className={cn(
                        "sticky left-0 z-10 border-b border-border px-3 py-2 font-medium",
                        pi % 2 === 0
                          ? "bg-slate-50/80 dark:bg-slate-900/40"
                          : "bg-white dark:bg-background",
                      )}
                    >
                      <span className="block">{p.periodLabel}</span>
                      <span className="block text-xs font-normal text-muted-foreground">
                        {p.periodStart} — {p.periodEnd}
                      </span>
                    </td>
                    {outlets.map((o, i) => (
                      <td
                        key={o.id}
                        className="border-b border-border px-2 py-2 text-right tabular-nums"
                      >
                        {formatMoney(p.outletNetProfit[i] ?? 0)}
                      </td>
                    ))}
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">
                      {formatMoney(p.warehouseNetProfit)}
                    </td>
                    <td className="border-b border-border px-2 py-2 text-right font-medium tabular-nums">
                      {formatMoney(p.totalBusinessNetProfit)}
                    </td>
                  </tr>
                ))}
                {periodTotals ? (
                  <tr className="bg-slate-200/90 font-semibold dark:bg-slate-800/80">
                    <td
                      className={cn(
                        "sticky left-0 z-10 border-b border-border bg-slate-200/90 px-3 py-2 dark:bg-slate-800/80",
                      )}
                    >
                      Period totals (sum of nets)
                    </td>
                    {outlets.map((o, i) => (
                      <td
                        key={o.id}
                        className="border-b border-border px-2 py-2 text-right tabular-nums"
                      >
                        {formatMoney(periodTotals.outletTotals[i] ?? 0)}
                      </td>
                    ))}
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">
                      {formatMoney(periodTotals.whTotal)}
                    </td>
                    <td className="border-b border-border px-2 py-2 text-right tabular-nums">
                      {formatMoney(periodTotals.bizTotal)}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
