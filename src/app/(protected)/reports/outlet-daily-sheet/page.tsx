"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useGetOutletsQuery, useLazyGetOutletDailySheetReportQuery } from "@/features/api/apiSlice";
import {
  selectAuthOutletId,
  selectCanViewOutletStockRemovals,
  selectIsOutletUser,
  selectIsSuperAdmin,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { printOutletDailySheetReport } from "@/lib/print-warehouse-document";
import { cn } from "@/lib/utils";
import type { OutletDailySheetReport } from "@/entities/types";

function maxDayInCalendarMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatDayLabel(isoDate: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, mo, da] = isoDate.split("-").map(Number);
    return new Date(y, mo - 1, da).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  return isoDate;
}

function formatQty(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function OutletDailySheetPage() {
  const canView = useAppSelector(selectCanViewOutletStockRemovals);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const isOutletUser = useAppSelector(selectIsOutletUser);
  const userOutletId = useAppSelector(selectAuthOutletId);

  const { data: outletsRes } = useGetOutletsQuery(undefined, {
    skip: !canView || isOutletUser,
  });
  const outlets = useMemo(
    () => (outletsRes?.success ? outletsRes.data ?? [] : []),
    [outletsRes],
  );

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [day, setDay] = useState(today.getDate());
  const [outletId, setOutletId] = useState("");
  const [report, setReport] = useState<OutletDailySheetReport | null>(null);

  const maxDay = useMemo(() => maxDayInCalendarMonth(year, month), [year, month]);

  useEffect(() => {
    setDay((d) => (d > maxDay ? maxDay : d));
  }, [maxDay]);

  useEffect(() => {
    if (!isOutletUser || !userOutletId) return;
    setOutletId(userOutletId);
  }, [isOutletUser, userOutletId]);

  useEffect(() => {
    if (isOutletUser || isSuperAdmin || outletId || outlets.length === 0) return;
    setOutletId(outlets[0].id);
  }, [isOutletUser, isSuperAdmin, outletId, outlets]);

  const effectiveOutletId = isOutletUser ? (userOutletId ?? "") : outletId;

  const [fetchReport, { isFetching }] = useLazyGetOutletDailySheetReportQuery();

  const isoDate = useMemo(() => toIsoDate(year, month, day), [year, month, day]);

  const runReport = useCallback(async () => {
    if (!effectiveOutletId) {
      toast.error(isSuperAdmin ? "Select an outlet" : "Outlet is required");
      return;
    }
    if (year < 2000 || year > 2100) {
      toast.error("Enter a valid year");
      return;
    }
    if (day < 1 || day > maxDay) {
      toast.error("Invalid day for this month");
      return;
    }
    try {
      const res = await fetchReport({
        outletId: effectiveOutletId,
        date: isoDate,
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
  }, [day, effectiveOutletId, fetchReport, isoDate, isSuperAdmin, maxDay, year]);

  const selectClass = cn(
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  const dayOptions = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => i + 1),
    [maxDay],
  );

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
          Outlet daily sheet
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Collection, saleable stock movement with sales value and estimated COGS,
          other expenses (Super Admin only), and a financial summary for one UTC
          calendar day.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
        {!isOutletUser ? (
          <div className="grid min-w-[12rem] gap-1.5">
            <Label htmlFor="sheet-outlet">Outlet</Label>
            <select
              id="sheet-outlet"
              className={selectClass}
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
            >
              <option value="">Select outlet</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.warehouseName ? ` · ${o.warehouseName}` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="grid w-[6.5rem] gap-1.5">
          <Label htmlFor="sheet-year">Year</Label>
          <Input
            id="sheet-year"
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!Number.isNaN(v)) setYear(v);
            }}
            className="tabular-nums"
          />
        </div>
        <div className="grid min-w-[8rem] gap-1.5">
          <Label htmlFor="sheet-month">Month</Label>
          <select
            id="sheet-month"
            className={selectClass}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1, 1).toLocaleString(undefined, { month: "long" })}
              </option>
            ))}
          </select>
        </div>
        <div className="grid min-w-[6rem] gap-1.5">
          <Label htmlFor="sheet-day">Day</Label>
          <select
            id="sheet-day"
            className={selectClass}
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
          >
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" onClick={() => void runReport()} disabled={isFetching}>
          {isFetching ? "Loading…" : "Run report"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-1.5"
          disabled={!report}
          onClick={() => {
            if (report) printOutletDailySheetReport(report);
          }}
        >
          <Printer className="size-4" />
          Print
        </Button>
      </div>

      {report ? (
        <div className="space-y-8 print:space-y-6">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{report.outletName}</span>
            {" · "}
            <span className="text-foreground">{report.warehouseName}</span>
            {" · "}
            {formatDayLabel(report.date)}
          </p>
          <p className="text-xs text-muted-foreground">
            Dates use the server UTC calendar day. Menu COGS uses current recipe
            costs (same caveat as the dashboard margin estimate).
          </p>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Collection</h2>
            <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/80 hover:bg-muted/80">
                    <TableHead className="text-right tabular-nums">Cash</TableHead>
                    <TableHead className="text-right tabular-nums">Card / bank</TableHead>
                    <TableHead className="text-right tabular-nums">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(report.collection.cashCollection)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(report.collection.bankCollection)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(report.collection.totalCollection)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              Saleable stock — Menu
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/80 hover:bg-muted/80">
                    <TableHead className="min-w-[8rem]">Item</TableHead>
                    <TableHead className="text-right tabular-nums">Opening</TableHead>
                    <TableHead className="text-right tabular-nums">In</TableHead>
                    <TableHead className="text-right tabular-nums">Avail.</TableHead>
                    <TableHead className="text-right tabular-nums">Sold</TableHead>
                    <TableHead className="text-right tabular-nums">Damage</TableHead>
                    <TableHead className="text-right tabular-nums">Staff</TableHead>
                    <TableHead className="text-right tabular-nums">Rem.</TableHead>
                    <TableHead className="text-right tabular-nums">Cost/u</TableHead>
                    <TableHead className="text-right tabular-nums">Sell/u</TableHead>
                    <TableHead className="text-right tabular-nums">Sales</TableHead>
                    <TableHead className="text-right tabular-nums">COGS</TableHead>
                    <TableHead className="text-right tabular-nums">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.menuRows.map((row) => (
                    <TableRow key={row.menuItemId}>
                      <TableCell className="font-medium">{row.itemName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.opening)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.purchasedIn)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.available)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.sold)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.damage)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.staff)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(row.remaining)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.costPerUnit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.sellPerUnit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.salesValue)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.cogs)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.profit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">
              Saleable stock — Direct retail
            </h2>
            <p className="text-xs text-muted-foreground">
              No stored default unit cost for direct items; COGS is shown as 0 (or
              em dash in print).
            </p>
            <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/80 hover:bg-muted/80">
                    <TableHead className="min-w-[8rem]">Item</TableHead>
                    <TableHead className="text-right tabular-nums">Opening</TableHead>
                    <TableHead className="text-right tabular-nums">In</TableHead>
                    <TableHead className="text-right tabular-nums">Avail.</TableHead>
                    <TableHead className="text-right tabular-nums">Sold</TableHead>
                    <TableHead className="text-right tabular-nums">Damage</TableHead>
                    <TableHead className="text-right tabular-nums">Staff</TableHead>
                    <TableHead className="text-right tabular-nums">Rem.</TableHead>
                    <TableHead className="text-right tabular-nums">Cost/u</TableHead>
                    <TableHead className="text-right tabular-nums">Sell/u</TableHead>
                    <TableHead className="text-right tabular-nums">Sales</TableHead>
                    <TableHead className="text-right tabular-nums">COGS</TableHead>
                    <TableHead className="text-right tabular-nums">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.directRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={13}
                        className="text-sm text-muted-foreground"
                      >
                        No direct retail stock rows for this outlet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.directRows.map((row) => (
                      <TableRow key={row.outletItemId}>
                        <TableCell className="font-medium">{row.itemName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.opening)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.purchasedIn)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.available)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.sold)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.damage)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.staff)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.remaining)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(row.sellPerUnit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(row.salesValue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {row.cogs === 0 ? "—" : formatMoney(row.cogs)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(row.profit)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          {report.includeExpenses ? (
            <section className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">
                Other purchases / expenses
              </h2>
              {report.expenseRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No expense entries for this outlet and date.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/80 hover:bg-muted/80">
                        <TableHead className="min-w-[12rem]">Item</TableHead>
                        <TableHead className="text-right tabular-nums">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.expenseRows.map((e, idx) => (
                        <TableRow key={`${e.itemName}-${idx}`}>
                          <TableCell className="font-medium">{e.itemName}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(e.totalCost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">
              Other daily purchases are visible to Super Admin only.
            </p>
          )}

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Summary</h2>
            <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm max-w-md">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">
                      Total sales (receipts)
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(report.summary.totalSalesValue)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Saleable COGS</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(report.summary.saleableCogs)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Gross profit</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(report.summary.grossProfit)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Other purchase cost</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(report.summary.otherPurchaseCost)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-semibold">Net profit</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {formatMoney(report.summary.netProfit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
