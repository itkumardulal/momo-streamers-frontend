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
import {
  useGetWarehousesQuery,
  useLazyGetWarehouseDailyStockReportQuery,
} from "@/features/api/apiSlice";
import {
  selectAuthWarehouseId,
  selectCanPostWarehouseInventory,
  selectIsSuperAdmin,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { printWarehouseDailyStockReport } from "@/lib/print-warehouse-document";
import { cn } from "@/lib/utils";
import type { WarehouseDailyStockReport } from "@/entities/types";

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

export default function WarehouseStockReportPage() {
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const userWarehouseId = useAppSelector(selectAuthWarehouseId);
  const canView = useAppSelector(selectCanPostWarehouseInventory);

  const { data: warehousesRes } = useGetWarehousesQuery(undefined, {
    skip: !isSuperAdmin || !canView,
  });
  const warehouses = useMemo(
    () => (warehousesRes?.success ? warehousesRes.data ?? [] : []),
    [warehousesRes],
  );

  const defaultRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 6);
    return { from: ymd(from), to: ymd(to) };
  }, []);

  const [warehouseId, setWarehouseId] = useState("");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [report, setReport] = useState<WarehouseDailyStockReport | null>(null);

  const [fetchReport, { isFetching }] = useLazyGetWarehouseDailyStockReportQuery();

  useEffect(() => {
    if (!isSuperAdmin || warehouseId || warehouses.length === 0) return;
    setWarehouseId(warehouses[0].id);
  }, [isSuperAdmin, warehouseId, warehouses]);

  const effectiveWarehouseId = isSuperAdmin ? warehouseId : userWarehouseId ?? "";

  const runReport = useCallback(async () => {
    if (!effectiveWarehouseId) {
      toast.error("Select a warehouse");
      return;
    }
    if (!fromDate || !toDate) {
      toast.error("Choose from and to dates");
      return;
    }
    try {
      const res = await fetchReport({
        warehouseId: isSuperAdmin ? effectiveWarehouseId : undefined,
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
  }, [
    effectiveWarehouseId,
    fetchReport,
    fromDate,
    isSuperAdmin,
    toDate,
  ]);

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
          Warehouse daily stock
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One table per day (UTC). Columns for transfers match your warehouse
          outlets.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-white p-4 shadow-sm">
        {isSuperAdmin ? (
          <div className="grid gap-1.5 min-w-[12rem]">
            <Label htmlFor="report-wh">Warehouse</Label>
            <select
              id="report-wh"
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
            if (report) printWarehouseDailyStockReport(report);
          }}
        >
          <Printer className="size-4" />
          Print
        </Button>
      </div>

      {report ? (
        <div className="space-y-10">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{report.warehouseName}</span>
            {" · "}
            {formatDayLabel(report.fromDate)} – {formatDayLabel(report.toDate)}
          </p>
          {report.days.map((day) => (
            <section key={day.date} className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">
                {formatDayLabel(day.date)}
              </h2>
              <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/80 hover:bg-muted/80">
                      <TableHead className="min-w-[8rem]">Item</TableHead>
                      <TableHead className="text-right tabular-nums">
                        Opening
                      </TableHead>
                      <TableHead className="text-right tabular-nums">
                        Production
                      </TableHead>
                      {report.outletColumns.map((o) => (
                        <TableHead
                          key={o.id}
                          className="text-right tabular-nums min-w-[7rem]"
                        >
                          {o.name}
                        </TableHead>
                      ))}
                      <TableHead className="text-right tabular-nums">Damage</TableHead>
                      <TableHead className="text-right tabular-nums">Closing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {day.rows.map((row) => (
                      <TableRow key={row.menuItemId}>
                        <TableCell className="font-medium">{row.itemName}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.openingStock)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.productionAdded)}
                        </TableCell>
                        {report.outletColumns.map((o, i) => (
                          <TableCell
                            key={o.id}
                            className="text-right tabular-nums"
                          >
                            {formatQty(row.transferQuantities[i] ?? 0)}
                          </TableCell>
                        ))}
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.damage)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatQty(row.closingStock)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
