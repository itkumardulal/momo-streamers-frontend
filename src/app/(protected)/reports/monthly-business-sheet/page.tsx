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
  useLazyGetMonthlyBusinessSheetQuery,
} from "@/features/api/apiSlice";
import {
  selectAuthWarehouseId,
  selectCanViewMonthlyBusinessSheet,
  selectIsSuperAdmin,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { printMonthlyBusinessSheet } from "@/lib/print-warehouse-document";
import { cn } from "@/lib/utils";
import type { MonthlyBusinessSheet } from "@/entities/types";

function ymNow() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function parseYm(s: string): { year: number; month: number } | null {
  if (!/^\d{4}-\d{2}$/.test(s)) return null;
  const [y, mo] = s.split("-").map(Number);
  if (mo < 1 || mo > 12) return null;
  return { year: y, month: mo };
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function MonthlyBusinessSheetPage() {
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

  const [warehouseId, setWarehouseId] = useState("");
  const [monthYm, setMonthYm] = useState(ymNow);
  const [report, setReport] = useState<MonthlyBusinessSheet | null>(null);

  const [fetchSheet, { isFetching }] = useLazyGetMonthlyBusinessSheetQuery();

  useEffect(() => {
    if (!isSuperAdmin || warehouseId || warehouses.length === 0) return;
    setWarehouseId(warehouses[0].id);
  }, [isSuperAdmin, warehouseId, warehouses]);

  const effectiveWarehouseId = isSuperAdmin ? warehouseId : userWarehouseId ?? "";

  const runReport = useCallback(async () => {
    const ym = parseYm(monthYm);
    if (!ym) {
      toast.error("Choose a valid month");
      return;
    }
    if (!effectiveWarehouseId) {
      toast.error("Select a warehouse");
      return;
    }
    try {
      const res = await fetchSheet({
        year: ym.year,
        month: ym.month,
        warehouseId: effectiveWarehouseId,
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
  }, [effectiveWarehouseId, fetchSheet, monthYm]);

  const selectClass = cn(
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  const onPrint = () => {
    if (!report) {
      toast.error("Load the report first");
      return;
    }
    if (!printMonthlyBusinessSheet(report)) {
      toast.error("Pop-up blocked — allow pop-ups to print");
    }
  };

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

  const outlets = report?.outlets ?? [];

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
          Monthly business sheet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Income and expenses by outlet under a warehouse, plus warehouse-level
          expenses. Revenue comes from outlet POS; fill daily expenses with outlet
          or warehouse location.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
        {isSuperAdmin ? (
          <div className="grid min-w-[12rem] gap-1.5">
            <Label htmlFor="mbs-wh">Warehouse</Label>
            <select
              id="mbs-wh"
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
        <div className="grid gap-1.5">
          <Label htmlFor="mbs-month">Month</Label>
          <Input
            id="mbs-month"
            type="month"
            value={monthYm}
            onChange={(e) => setMonthYm(e.target.value)}
            className="w-[11rem]"
          />
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
        <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
          <div className="border-b border-border bg-[#2f5597] px-4 py-3 text-white">
            <p className="text-sm font-medium opacity-90">
              {new Date(report.year, report.month - 1, 1).toLocaleString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-lg font-semibold tracking-tight">
              {report.warehouseName} — Momo business monthly sheet
            </p>
          </div>
          <p className="border-b border-border bg-slate-100 px-4 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Totals, profit and margin are calculated from POS sales and daily
            expenses (categories mapped on expense items). Warehouse sales stay
            zero.
          </p>
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-teal-600 text-white">
                <th className="sticky left-0 z-10 border-b border-teal-700 bg-teal-600 px-3 py-2 text-left font-semibold">
                  Revenue
                </th>
                {outlets.map((o) => (
                  <th
                    key={o.id}
                    className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums"
                  >
                    {o.name}
                  </th>
                ))}
                <th className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums">
                  Warehouse
                </th>
                <th className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-amber-50/90 dark:bg-amber-950/30">
                <td className="sticky left-0 z-10 border-b border-border bg-amber-50/90 px-3 py-2 font-medium dark:bg-amber-950/30">
                  Sales
                </td>
                {report.outletSales.map((v, i) => (
                  <td
                    key={outlets[i]?.id ?? i}
                    className="border-b border-border px-2 py-2 text-right tabular-nums"
                  >
                    {formatMoney(v)}
                  </td>
                ))}
                <td className="border-b border-border px-2 py-2 text-right tabular-nums text-muted-foreground">
                  {formatMoney(0)}
                </td>
                <td className="border-b border-border px-2 py-2 text-right font-medium tabular-nums">
                  {formatMoney(report.totalSales)}
                </td>
              </tr>
              <tr className="bg-amber-50/90 dark:bg-amber-950/30">
                <td className="sticky left-0 z-10 border-b border-border bg-amber-50/90 px-3 py-2 font-medium dark:bg-amber-950/30">
                  Other income
                </td>
                {report.outletOtherIncome.map((v, i) => (
                  <td
                    key={outlets[i]?.id ?? i}
                    className="border-b border-border px-2 py-2 text-right tabular-nums"
                  >
                    {formatMoney(v)}
                  </td>
                ))}
                <td className="border-b border-border px-2 py-2 text-right tabular-nums text-muted-foreground">
                  {formatMoney(0)}
                </td>
                <td className="border-b border-border px-2 py-2 text-right font-medium tabular-nums">
                  {formatMoney(report.totalOtherIncome)}
                </td>
              </tr>
              <tr className="bg-teal-50/80 font-semibold dark:bg-teal-950/20">
                <td className="sticky left-0 z-10 border-b border-border bg-teal-50/80 px-3 py-2 dark:bg-teal-950/20">
                  Total revenue
                </td>
                {report.outletTotalRevenue.map((v, i) => (
                  <td
                    key={outlets[i]?.id ?? i}
                    className="border-b border-border px-2 py-2 text-right tabular-nums"
                  >
                    {formatMoney(v)}
                  </td>
                ))}
                <td className="border-b border-border px-2 py-2 text-right tabular-nums text-muted-foreground">
                  {formatMoney(0)}
                </td>
                <td className="border-b border-border px-2 py-2 text-right tabular-nums">
                  {formatMoney(report.totalRevenue)}
                </td>
              </tr>
            </tbody>
          </table>

          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-teal-600 text-white">
                <th className="sticky left-0 z-10 border-b border-teal-700 bg-teal-600 px-3 py-2 text-left font-semibold">
                  Operating expenses
                </th>
                {outlets.map((o) => (
                  <th
                    key={o.id}
                    className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums"
                  >
                    {o.name}
                  </th>
                ))}
                <th className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums">
                  Warehouse
                </th>
                <th className="border-b border-teal-700 px-2 py-2 text-right font-semibold tabular-nums">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {report.expenseRows.length === 0 ? (
                <tr>
                  <td
                    className="sticky left-0 z-10 border-b border-border bg-white px-3 py-2 text-muted-foreground dark:bg-background"
                    colSpan={outlets.length + 3}
                  >
                    No expense entries found for this warehouse and month.
                  </td>
                </tr>
              ) : (
                report.expenseRows.map((row, ri) => (
                  <tr
                    key={row.expenseItemId}
                    className={ri % 2 === 0 ? "bg-slate-50/80 dark:bg-slate-900/40" : ""}
                  >
                    <td
                      className={cn(
                        "sticky left-0 z-10 border-b border-border px-3 py-1.5 font-medium",
                        ri % 2 === 0
                          ? "bg-slate-50/80 dark:bg-slate-900/40"
                          : "bg-white dark:bg-background",
                      )}
                    >
                      {row.label}
                    </td>
                    {row.outletAmounts.map((v, i) => (
                      <td
                        key={outlets[i]?.id ?? i}
                        className="border-b border-border px-2 py-1.5 text-right tabular-nums"
                      >
                        {formatMoney(v)}
                      </td>
                    ))}
                    <td className="border-b border-border px-2 py-1.5 text-right tabular-nums">
                      {formatMoney(row.warehouseAmount)}
                    </td>
                    <td className="border-b border-border px-2 py-1.5 text-right font-medium tabular-nums">
                      {formatMoney(row.rowTotal)}
                    </td>
                  </tr>
                ))
              )}
              <tr className="bg-slate-100 font-semibold dark:bg-slate-800/60">
                <td className="sticky left-0 z-10 border-b border-border px-3 py-2">
                  Total expenses
                </td>
                {report.outletTotalExpenses.map((v, i) => (
                  <td
                    key={outlets[i]?.id ?? i}
                    className="border-b border-border px-2 py-2 text-right tabular-nums"
                  >
                    {formatMoney(v)}
                  </td>
                ))}
                <td className="border-b border-border px-2 py-2 text-right tabular-nums">
                  {formatMoney(report.warehouseTotalExpenses)}
                </td>
                <td className="border-b border-border px-2 py-2 text-right tabular-nums">
                  {formatMoney(report.grandTotalExpenses)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="grid gap-1 border-t border-border bg-slate-50 px-4 py-3 text-sm dark:bg-slate-900/50">
            <p>
              <span className="font-semibold text-foreground">Net profit: </span>
              <span className="tabular-nums">{formatMoney(report.netProfit)}</span>
            </p>
            <p>
              <span className="font-semibold text-foreground">Profit margin: </span>
              <span className="tabular-nums">{formatMoney(report.profitMarginPercent)}%</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
