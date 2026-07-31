"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
  ASSET_STATUS_OPTIONS,
  AssetStatus,
  type AssetReport,
} from "@/entities/types";
import {
  useGetAssetCategoriesQuery,
  useGetOutletsQuery,
  useGetWarehousesQuery,
  useLazyGetAssetsReportQuery,
} from "@/features/api/apiSlice";
import { selectIsSuperAdmin } from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { printAssetsReport } from "@/lib/print-warehouse-document";
import { cn } from "@/lib/utils";

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

function statusLabel(s: AssetStatus) {
  return ASSET_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? String(s);
}

const selectClass = cn(
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export default function AssetsReportPage() {
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const { data: catRes } = useGetAssetCategoriesQuery(undefined, {
    skip: !isSuperAdmin,
  });
  const { data: outletsRes } = useGetOutletsQuery(undefined, {
    skip: !isSuperAdmin,
  });
  const { data: warehousesRes } = useGetWarehousesQuery(undefined, {
    skip: !isSuperAdmin,
  });

  const categories = catRes?.success ? catRes.data ?? [] : [];
  const outlets = outletsRes?.success ? outletsRes.data ?? [] : [];
  const warehouses = warehousesRes?.success ? warehousesRes.data ?? [] : [];

  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<string>("");
  const [locationKind, setLocationKind] = useState<"none" | "outlet" | "warehouse">(
    "none",
  );
  const [outletId, setOutletId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [report, setReport] = useState<AssetReport | null>(null);

  const [fetchReport, { isFetching }] = useLazyGetAssetsReportQuery();

  const runReport = useCallback(async () => {
    try {
      const res = await fetchReport({
        ...(categoryId ? { categoryId } : {}),
        ...(status !== "" ? { status: Number(status) as AssetStatus } : {}),
        ...(locationKind === "outlet" && outletId ? { outletId } : {}),
        ...(locationKind === "warehouse" && warehouseId
          ? { warehouseId }
          : {}),
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
    categoryId,
    fetchReport,
    locationKind,
    outletId,
    status,
    warehouseId,
  ]);

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
            Assets report
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventory of long-term assets with purchase cost totals.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={!report}
          onClick={() => {
            if (report) printAssetsReport(report);
          }}
        >
          <Printer className="size-4" />
          Print
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <Label htmlFor="ar-cat">Category</Label>
          <select
            id="ar-cat"
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
        <div className="space-y-1">
          <Label htmlFor="ar-status">Status</Label>
          <select
            id="ar-status"
            className={cn(selectClass, "w-40")}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            {ASSET_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ar-loc">Location</Label>
          <select
            id="ar-loc"
            className={cn(selectClass, "w-40")}
            value={locationKind}
            onChange={(e) =>
              setLocationKind(e.target.value as "none" | "outlet" | "warehouse")
            }
          >
            <option value="none">Any</option>
            <option value="outlet">Outlet</option>
            <option value="warehouse">Warehouse</option>
          </select>
        </div>
        {locationKind === "outlet" && (
          <div className="space-y-1">
            <Label htmlFor="ar-outlet">Outlet</Label>
            <select
              id="ar-outlet"
              className={cn(selectClass, "w-48")}
              value={outletId}
              onChange={(e) => setOutletId(e.target.value)}
            >
              <option value="">Select outlet</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {locationKind === "warehouse" && (
          <div className="space-y-1">
            <Label htmlFor="ar-wh">Warehouse</Label>
            <select
              id="ar-wh"
              className={cn(selectClass, "w-48")}
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
        )}
        <Button type="button" disabled={isFetching} onClick={() => runReport()}>
          {isFetching ? "Loading…" : "Run report"}
        </Button>
      </div>

      {report && (
        <>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{report.totalCount}</strong>{" "}
              assets
            </span>
            <span>
              Total purchase cost{" "}
              <strong className="text-foreground">
                {formatMoney(report.totalPurchaseCost)}
              </strong>
            </span>
          </div>
          <div className="rounded-lg border border-border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Purchase date</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Warranty</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground">
                      No assets match the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.categoryName}</TableCell>
                      <TableCell>{statusLabel(row.status)}</TableCell>
                      <TableCell>{formatDay(row.purchaseDate)}</TableCell>
                      <TableCell className="text-right">
                        {formatMoney(row.purchaseCost)}
                      </TableCell>
                      <TableCell>
                        {row.warrantyExpiry
                          ? formatDay(row.warrantyExpiry)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.outletName || row.warehouseName || "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">
                        {row.remarks || "—"}
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
