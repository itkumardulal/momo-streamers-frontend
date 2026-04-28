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
import { useGetOutletsQuery, useLazyGetOutletDailyStockReportQuery } from "@/features/api/apiSlice";
import {
  selectAuthOutletId,
  selectCanViewOutletStockRemovals,
  selectIsOutletUser,
  selectIsSuperAdmin,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { printOutletDailyStockReport } from "@/lib/print-warehouse-document";
import { cn } from "@/lib/utils";
import type { OutletDailyStockReport } from "@/entities/types";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

export default function OutletDailyStockReportPage() {
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

  const defaultRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 6);
    return { from: ymd(from), to: ymd(to) };
  }, []);

  const [outletId, setOutletId] = useState("");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [report, setReport] = useState<OutletDailyStockReport | null>(null);

  const [fetchReport, { isFetching }] = useLazyGetOutletDailyStockReportQuery();

  useEffect(() => {
    if (!isOutletUser || !userOutletId) return;
    setOutletId(userOutletId);
  }, [isOutletUser, userOutletId]);

  useEffect(() => {
    if (isOutletUser || isSuperAdmin || outletId || outlets.length === 0) return;
    setOutletId(outlets[0].id);
  }, [isOutletUser, isSuperAdmin, outletId, outlets]);

  const effectiveOutletId = isOutletUser ? (userOutletId ?? "") : outletId;

  const runReport = useCallback(async () => {
    if (!effectiveOutletId) {
      toast.error(isSuperAdmin ? "Select an outlet" : "Outlet is required");
      return;
    }
    if (!fromDate || !toDate) {
      toast.error("Choose from and to dates");
      return;
    }
    try {
      const res = await fetchReport({
        outletId: effectiveOutletId,
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
  }, [effectiveOutletId, fetchReport, fromDate, isSuperAdmin, toDate]);

  const selectClass = cn(
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
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
          Outlet daily stock
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Momo (menu) stock from warehouse transfers, sales, and removals; drinks
          / retail from purchases and sales. One block per day (UTC midnight,
          same as stock history).
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
        {!isOutletUser ? (
          <div className="grid min-w-[12rem] gap-1.5">
            <Label htmlFor="report-outlet">Outlet</Label>
            <select
              id="report-outlet"
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
        <div className="grid gap-1.5">
          <Label htmlFor="from-date">From</Label>
          <Input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-[11rem]"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="to-date">To</Label>
          <Input
            id="to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-[11rem]"
          />
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
            if (report) printOutletDailyStockReport(report);
          }}
        >
          <Printer className="size-4" />
          Print
        </Button>
      </div>

      {report ? (
        <div className="space-y-10">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{report.outletName}</span>
            {" · "}
            <span className="text-foreground">{report.warehouseName}</span>
            {" · "}
            {formatDayLabel(report.fromDate)} – {formatDayLabel(report.toDate)}
          </p>
          {report.days.map((day) => (
            <section key={day.date} className="space-y-4">
              <h2 className="text-base font-semibold text-foreground">
                {formatDayLabel(day.date)}
              </h2>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Momo (menu) stock
                </h3>
                <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/80 hover:bg-muted/80">
                        <TableHead className="min-w-[8rem]">Item</TableHead>
                        <TableHead className="text-right tabular-nums">Opening</TableHead>
                        <TableHead className="text-right tabular-nums">
                          In (transfer)
                        </TableHead>
                        <TableHead className="text-right tabular-nums">Sold</TableHead>
                        <TableHead className="text-right tabular-nums">Damage</TableHead>
                        <TableHead className="text-right tabular-nums">Staff</TableHead>
                        <TableHead className="text-right tabular-nums">Closing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {day.menuRows.map((row) => (
                        <TableRow key={row.menuItemId}>
                          <TableCell className="font-medium">{row.itemName}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatQty(row.openingStock)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatQty(row.transferIn)}
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
                            {formatQty(row.closingStock)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Drinks / retail
                </h3>
                <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/80 hover:bg-muted/80">
                        <TableHead className="min-w-[8rem]">Item</TableHead>
                        <TableHead className="text-right tabular-nums">Opening</TableHead>
                        <TableHead className="text-right tabular-nums">Purchased</TableHead>
                        <TableHead className="text-right tabular-nums">Sold</TableHead>
                        <TableHead className="text-right tabular-nums">Damage</TableHead>
                        <TableHead className="text-right tabular-nums">Staff</TableHead>
                        <TableHead className="text-right tabular-nums">Closing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {day.directRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-sm text-muted-foreground"
                          >
                            No direct retail stock rows for this outlet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        day.directRows.map((row) => (
                          <TableRow key={row.outletItemId}>
                            <TableCell className="font-medium">{row.itemName}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatQty(row.openingStock)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatQty(row.purchasedIn)}
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
                              {formatQty(row.closingStock)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
