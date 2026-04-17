"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { OutletSaleListItem } from "@/entities/types";
import {
  useGetDashboardFinancialSummaryQuery,
  useGetDashboardStockSummaryQuery,
  useGetOutletItemPurchasesQuery,
  useGetOutletSalesQuery,
  useGetOutletSalesMarginEstimateQuery,
  useGetOutletSellableStockQuery,
  useGetOutletsQuery,
  useGetOutletStockRemovalsQuery,
  useGetRawMaterialPurchasesQuery,
  useGetWarehouseProductionsQuery,
  useGetWarehouseTransfersQuery,
  useGetWarehousesQuery,
} from "@/features/api/apiSlice";
import {
  normalizeAuthRole,
  selectAuth,
  selectAuthOutletId,
  selectAuthWarehouseId,
  selectCanPostWarehouseInventory,
  selectCanUseOutletPurchasePage,
  selectCanViewOutletStockRemovals,
  selectIsOutletUser,
  selectIsSuperAdmin,
  selectIsWarehouseUser,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function utcYmd(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function parseRangeBounds(from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  const end = new Date(`${to}T23:59:59.999Z`).getTime();
  return { start, end };
}

function isoInRange(iso: string, from: string, to: string) {
  const t = new Date(iso).getTime();
  const { start, end } = parseRangeBounds(from, to);
  return t >= start && t <= end;
}

function purchaseDateInRange(purchaseDate: string, from: string, to: string) {
  return purchaseDate >= from && purchaseDate <= to;
}

const PIE_COLORS = ["hsl(221 83% 53%)", "hsl(142 76% 36%)"];
const BAR_FILL = "hsl(221 83% 53%)";
const STOCK_IN_COLOR = "hsl(142 76% 36%)";
const STOCK_OUT_COLOR = "hsl(0 72% 51%)";
const COMP_SOLD = "hsl(221 83% 53%)";
const COMP_DAMAGE = "hsl(38 92% 50%)";
const COMP_STAFF = "hsl(280 65% 60%)";

const FIN_LINE_COLORS = [
  "hsl(221 83% 53%)",
  "hsl(0 72% 51%)",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(199 89% 48%)",
  "hsl(330 81% 60%)",
  "hsl(160 60% 45%)",
  "hsl(24 95% 53%)",
  "hsl(262 83% 58%)",
  "hsl(180 55% 40%)",
];

function formatQty(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function DashboardView() {
  const auth = useAppSelector(selectAuth);
  const roleNorm = normalizeAuthRole(auth.role);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const isWarehouseUser = useAppSelector(selectIsWarehouseUser);
  const isOutletUser = useAppSelector(selectIsOutletUser);
  const userOutletId = useAppSelector(selectAuthOutletId);
  const userWarehouseId = useAppSelector(selectAuthWarehouseId);
  const canWarehouseStock = useAppSelector(selectCanPostWarehouseInventory);
  const canOutletPurchases = useAppSelector(selectCanUseOutletPurchasePage);
  const canViewStockRemovals = useAppSelector(selectCanViewOutletStockRemovals);

  const defaultRange = useMemo(() => {
    const today = ymd(new Date());
    return { from: today, to: today };
  }, []);

  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [warehouseId, setWarehouseId] = useState("");
  const [salesOutletFilter, setSalesOutletFilter] = useState("");

  const { data: warehousesRes } = useGetWarehousesQuery(undefined, {
    skip: !isSuperAdmin,
  });
  const warehouses = useMemo(
    () => (warehousesRes?.success ? warehousesRes.data ?? [] : []),
    [warehousesRes],
  );

  const { data: outletsRes } = useGetOutletsQuery();
  const outlets = useMemo(
    () => (outletsRes?.success ? outletsRes.data ?? [] : []),
    [outletsRes],
  );

  useEffect(() => {
    if (!isSuperAdmin || warehouseId || warehouses.length === 0) return;
    setWarehouseId(warehouses[0].id);
  }, [isSuperAdmin, warehouseId, warehouses]);

  const effectiveWarehouseId = isSuperAdmin ? warehouseId : userWarehouseId ?? "";

  const outletsForFilter = useMemo(() => {
    if (isSuperAdmin) return outlets;
    if (isWarehouseUser && userWarehouseId)
      return outlets.filter((o) => o.warehouseId === userWarehouseId);
    return outlets;
  }, [isSuperAdmin, isWarehouseUser, outlets, userWarehouseId]);

  const salesQueryArg = useMemo(() => {
    const base: { fromDate: string; toDate: string; outletId?: string } = {
      fromDate,
      toDate,
    };
    if ((isSuperAdmin || isWarehouseUser) && salesOutletFilter)
      base.outletId = salesOutletFilter;
    return base;
  }, [fromDate, toDate, isSuperAdmin, isWarehouseUser, salesOutletFilter]);

  const { data: salesRes, isFetching: salesLoading } = useGetOutletSalesQuery(
    salesQueryArg,
    { skip: !fromDate || !toDate },
  );
  const sales = useMemo(
    () => (salesRes?.success ? salesRes.data ?? [] : []),
    [salesRes],
  );

  const { data: marginRes, isFetching: marginLoading } =
    useGetOutletSalesMarginEstimateQuery(
      {
        fromDate,
        toDate,
        ...((isSuperAdmin || isWarehouseUser) && salesOutletFilter
          ? { outletId: salesOutletFilter }
          : {}),
      },
      { skip: !fromDate || !toDate },
    );
  const margin = marginRes?.success ? marginRes.data : null;

  const financialQueryArg = useMemo(
    () => ({
      fromDate,
      toDate,
      ...((isSuperAdmin || isWarehouseUser) && salesOutletFilter
        ? { outletId: salesOutletFilter }
        : {}),
    }),
    [fromDate, isSuperAdmin, isWarehouseUser, salesOutletFilter, toDate],
  );

  const {
    data: financialRes,
    isFetching: financialLoading,
    isError: financialIsError,
  } = useGetDashboardFinancialSummaryQuery(financialQueryArg, {
    skip: !fromDate || !toDate,
  });
  const financial = financialRes?.success ? financialRes.data : null;

  const financialCategoryPie = useMemo(() => {
    if (!financial?.categoryMix?.length) return [];
    return financial.categoryMix.map((c) => ({
      name: c.categoryName.length > 22 ? `${c.categoryName.slice(0, 20)}…` : c.categoryName,
      value: Math.round(c.revenueTotal * 100) / 100,
    }));
  }, [financial?.categoryMix]);

  const financialOutletLineChart = useMemo(() => {
    if (!financial?.outletDailySales?.length) return { data: [] as Record<string, string | number>[], series: [] as { id: string; name: string }[] };
    const series = financial.outletDailySales.map((s) => ({
      id: `o_${s.outletId}`,
      name: s.outletName,
    }));
    const dates = financial.outletDailySales[0].points.map((p) => p.date);
    const data = dates.map((date) => {
      const row: Record<string, string | number> = { date };
      for (const s of financial.outletDailySales) {
        const id = `o_${s.outletId}`;
        const pt = s.points.find((p) => p.date === date);
        row[id] = pt ? Math.round(pt.salesTotal * 100) / 100 : 0;
      }
      return row;
    });
    return { data, series };
  }, [financial?.outletDailySales]);

  const financialProfitCollectionData = useMemo(() => {
    if (!financial?.days?.length) return [];
    return financial.days.map((d) => ({
      date: d.date,
      profit: Math.round(d.estimatedNetProfit * 100) / 100,
      collection: Math.round(d.collectionTotal * 100) / 100,
    }));
  }, [financial?.days]);

  const sellableOutletId = useMemo(() => {
    if (userOutletId) return userOutletId;
    if ((isSuperAdmin || isWarehouseUser) && salesOutletFilter) return salesOutletFilter;
    return undefined;
  }, [isSuperAdmin, isWarehouseUser, salesOutletFilter, userOutletId]);

  const { data: sellableRes, isFetching: sellableLoading } =
    useGetOutletSellableStockQuery(sellableOutletId, {
      skip: !sellableOutletId,
    });
  const sellableRows = useMemo(
    () => (sellableRes?.success ? sellableRes.data ?? [] : []),
    [sellableRes],
  );

  const dashboardStockQueryArg = useMemo(() => {
    const base = { fromDate, toDate };
    if (isSuperAdmin) {
      return {
        ...base,
        ...(warehouseId ? { warehouseId } : {}),
        ...(salesOutletFilter ? { outletId: salesOutletFilter } : {}),
      };
    }
    if (isWarehouseUser && userWarehouseId) {
      return {
        ...base,
        warehouseId: userWarehouseId,
        ...(salesOutletFilter ? { outletId: salesOutletFilter } : {}),
      };
    }
    return base;
  }, [fromDate, toDate, isSuperAdmin, isWarehouseUser, salesOutletFilter, userWarehouseId, warehouseId]);

  const skipDashboardStock = useMemo(() => {
    if (!fromDate || !toDate) return true;
    if (isSuperAdmin) return !warehouseId && !salesOutletFilter;
    return false;
  }, [fromDate, isSuperAdmin, salesOutletFilter, toDate, warehouseId]);

  const {
    data: dashStockRes,
    isFetching: dashStockLoading,
    isError: dashStockIsError,
  } = useGetDashboardStockSummaryQuery(dashboardStockQueryArg, {
    skip: skipDashboardStock,
  });
  const dashStock = dashStockRes?.success ? dashStockRes.data : null;

  const removalsQueryArg = useMemo(() => {
    const base: { fromDate: string; toDate: string; outletId?: string } = { fromDate, toDate };
    if (isOutletUser && userOutletId) base.outletId = userOutletId;
    else if ((isSuperAdmin || isWarehouseUser) && salesOutletFilter)
      base.outletId = salesOutletFilter;
    return base;
  }, [fromDate, isOutletUser, isSuperAdmin, isWarehouseUser, salesOutletFilter, toDate, userOutletId]);

  const { data: removalsRes } = useGetOutletStockRemovalsQuery(removalsQueryArg, {
    skip: !fromDate || !toDate || !canViewStockRemovals,
  });
  const removals = useMemo(
    () => (removalsRes?.success ? removalsRes.data ?? [] : []),
    [removalsRes],
  );

  const transfersArg =
    isSuperAdmin && effectiveWarehouseId
      ? { warehouseId: effectiveWarehouseId }
      : isWarehouseUser
        ? { warehouseId: userWarehouseId ?? undefined }
        : undefined;
  const { data: transfersRes } = useGetWarehouseTransfersQuery(transfersArg, {
    skip:
      (!isSuperAdmin && !isWarehouseUser) ||
      (isSuperAdmin && !effectiveWarehouseId),
  });
  const transfers = useMemo(
    () => (transfersRes?.success ? transfersRes.data ?? [] : []),
    [transfersRes],
  );

  const productionArg =
    isSuperAdmin && effectiveWarehouseId
      ? { warehouseId: effectiveWarehouseId }
      : isWarehouseUser
        ? { warehouseId: userWarehouseId ?? undefined }
        : undefined;
  const { data: productionsRes } = useGetWarehouseProductionsQuery(productionArg, {
    skip:
      (!isSuperAdmin && !isWarehouseUser) ||
      (isSuperAdmin && !effectiveWarehouseId),
  });
  const productions = useMemo(
    () => (productionsRes?.success ? productionsRes.data ?? [] : []),
    [productionsRes],
  );

  const rmArg =
    isSuperAdmin && effectiveWarehouseId
      ? { warehouseId: effectiveWarehouseId }
      : isWarehouseUser
        ? { warehouseId: userWarehouseId ?? undefined }
        : undefined;
  const { data: rmPurchasesRes } = useGetRawMaterialPurchasesQuery(rmArg, {
    skip:
      (!isSuperAdmin && !isWarehouseUser) ||
      (isSuperAdmin && !effectiveWarehouseId),
  });
  const rmPurchases = useMemo(
    () => (rmPurchasesRes?.success ? rmPurchasesRes.data ?? [] : []),
    [rmPurchasesRes],
  );

  const outletPurchaseArg = isSuperAdmin
    ? salesOutletFilter
      ? { outletId: salesOutletFilter }
      : undefined
    : userOutletId
      ? { outletId: userOutletId }
      : undefined;
  const { data: outletPurchasesRes } = useGetOutletItemPurchasesQuery(outletPurchaseArg, {
    skip: !canOutletPurchases || (!isSuperAdmin && !userOutletId),
  });
  const outletPurchases = useMemo(
    () => (outletPurchasesRes?.success ? outletPurchasesRes.data ?? [] : []),
    [outletPurchasesRes],
  );

  const totals = useMemo(() => {
    let grand = 0;
    let cash = 0;
    let bank = 0;
    for (const s of sales) {
      grand += s.grandTotal;
      cash += s.cashPaidAmount;
      bank += s.bankPaidAmount;
    }
    return {
      grand,
      cash,
      bank,
      count: sales.length,
    };
  }, [sales]);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sales) {
      const d = utcYmd(s.saleAtUtc);
      map.set(d, (map.get(d) ?? 0) + s.grandTotal);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, total]) => ({ day, total: Math.round(total * 100) / 100 }));
  }, [sales]);

  const byOutlet = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const s of sales) {
      const cur = map.get(s.outletId) ?? { name: s.outletName, total: 0 };
      cur.total += s.grandTotal;
      cur.name = s.outletName || cur.name;
      map.set(s.outletId, cur);
    }
    return [...map.values()]
      .map((o) => ({
        name: o.name.length > 18 ? `${o.name.slice(0, 16)}…` : o.name,
        total: Math.round(o.total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);
  }, [sales]);

  const pieData = useMemo(() => {
    if (totals.cash + totals.bank <= 0) return [];
    return [
      { name: "Cash", value: Math.round(totals.cash * 100) / 100 },
      { name: "Bank", value: Math.round(totals.bank * 100) / 100 },
    ];
  }, [totals.bank, totals.cash]);

  const activityRows = useMemo(() => {
    const rows: { label: string; count: number }[] = [];
    rows.push({
      label: "POS sales (receipts)",
      count: sales.length,
    });
    if (isSuperAdmin || isWarehouseUser) {
      rows.push({
        label: "Warehouse transfers",
        count: transfers.filter((t) => isoInRange(t.createdAt, fromDate, toDate)).length,
      });
      rows.push({
        label: "Warehouse production",
        count: productions.filter((p) => isoInRange(p.createdAt, fromDate, toDate)).length,
      });
      rows.push({
        label: "Raw material purchases (not menu stock)",
        count: rmPurchases.filter((p) =>
          purchaseDateInRange(p.purchaseDate, fromDate, toDate),
        ).length,
      });
    }
    if (canOutletPurchases) {
      rows.push({
        label: "Outlet item purchases",
        count: outletPurchases.filter((p) =>
          purchaseDateInRange(p.purchaseDate, fromDate, toDate),
        ).length,
      });
    }
    if (canViewStockRemovals) {
      rows.push({
        label: "Outlet stock removals",
        count: removals.length,
      });
    }
    return rows;
  }, [
    canOutletPurchases,
    canViewStockRemovals,
    fromDate,
    isSuperAdmin,
    isWarehouseUser,
    outletPurchases,
    productions,
    removals.length,
    rmPurchases,
    sales.length,
    toDate,
    transfers,
  ]);

  const topOutlets = useMemo(() => {
    return [...byOutlet].slice(0, 8);
  }, [byOutlet]);

  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.saleAtUtc).getTime() - new Date(a.saleAtUtc).getTime())
      .slice(0, 12);
  }, [sales]);

  const outletStockOutPie = useMemo(() => {
    const c = dashStock?.outlet?.stockOutComposition;
    if (!c) return [];
    const parts = [
      { name: "Sold", value: Math.round(c.sold * 100) / 100 },
      { name: "Damage", value: Math.round(c.damage * 100) / 100 },
      { name: "Staff use", value: Math.round(c.staffUse * 100) / 100 },
    ];
    return parts.filter((p) => p.value > 0);
  }, [dashStock?.outlet?.stockOutComposition]);

  const selectClass = cn(
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  const estProfit =
    margin != null
      ? Math.round((margin.revenueTotal - margin.estimatedCostTotal) * 100) / 100
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{auth.email}</span>
          {roleNorm ? (
            <>
              {" "}
              · <span className="font-medium text-foreground">{roleNorm}</span>
            </>
          ) : null}
        </p>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Date range uses each sale&apos;s <span className="font-medium">SaleAtUtc</span> (UTC
            calendar day). POS data respects your account scope.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="dash-from">From</Label>
            <Input
              id="dash-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[11rem]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dash-to">To</Label>
            <Input
              id="dash-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[11rem]"
            />
          </div>
          {isSuperAdmin ? (
            <div className="space-y-1.5">
              <Label>Warehouse (stock &amp; scope)</Label>
              <select
                className={cn(selectClass, "min-w-[12rem]")}
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                <option value="">Select…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {(isSuperAdmin || isWarehouseUser) && outletsForFilter.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Outlet (optional)</Label>
              <select
                className={cn(selectClass, "min-w-[12rem]")}
                value={salesOutletFilter}
                onChange={(e) => setSalesOutletFilter(e.target.value)}
              >
                <option value="">All allowed outlets</option>
                {outletsForFilter.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Total sales"
          value={formatMoney(totals.grand)}
          loading={salesLoading}
        />
        <KpiCard title="Cash collected" value={formatMoney(totals.cash)} loading={salesLoading} />
        <KpiCard title="Bank collected" value={formatMoney(totals.bank)} loading={salesLoading} />
        <KpiCard title="POS receipts" value={String(totals.count)} loading={salesLoading} />
        <KpiCard
          title="Est. profit"
          subtitle="After est. COGS*"
          value={estProfit != null ? formatMoney(estProfit) : "—"}
          loading={salesLoading || marginLoading}
        />
      </div>

      <Card className="border-amber-200/80 bg-amber-50/50 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
        <CardContent className="pt-4 text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">*</span> Estimated cost and profit use
          current menu item costs on the server, not the cost at the time of each sale. Direct
          (non-menu) POS lines have no cost in this estimate. Treat as indicative only.
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Financial summary
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Per-day sales, estimated net profit, and collection; sales mix by menu category; daily
            sales by outlet when viewing multiple outlets. Same scope as POS filters
            {isSuperAdmin || isWarehouseUser
              ? " (optional outlet narrows all widgets)."
              : "."}
          </p>
        </div>

        {financialLoading ? (
          <Card className="border-border shadow-sm">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading financial summary…
            </CardContent>
          </Card>
        ) : financialIsError ? (
          <Card className="border-destructive/40 shadow-sm">
            <CardContent className="py-6 text-sm text-destructive">
              Could not load financial summary. Try a shorter date range (max 93 days).
            </CardContent>
          </Card>
        ) : financial ? (
          <>
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Daily breakdown (UTC)</CardTitle>
                <CardDescription>
                  Sales = receipt grand total; collection = cash + bank; est. net profit = sales −
                  est. COGS (menu lines only).
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-80 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Est. net profit</TableHead>
                      <TableHead className="text-right">Collection</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financial.days.map((d) => (
                      <TableRow key={d.date}>
                        <TableCell className="font-mono text-xs">{d.date}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(d.salesTotal)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(d.estimatedNetProfit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(d.collectionTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Category sales</CardTitle>
                  <CardDescription>Revenue by menu category (POS menu lines + direct bucket)</CardDescription>
                </CardHeader>
                <CardContent>
                  {financial.categoryMix.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No category revenue in range.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {financial.categoryMix.map((c) => (
                          <TableRow key={c.categoryName}>
                            <TableCell>{c.categoryName}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatMoney(c.revenueTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Sales mix</CardTitle>
                  <CardDescription>Share of menu category revenue</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  {financialCategoryPie.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No mix data.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={financialCategoryPie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={44}
                          outerRadius={78}
                          paddingAngle={1}
                        >
                          {financialCategoryPie.map((_, i) => (
                            <Cell key={i} fill={FIN_LINE_COLORS[i % FIN_LINE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatMoney(Number(v))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">
                  {financial.singleOutletScope ? "Daily sales" : "Daily sales by outlet"}
                </CardTitle>
                <CardDescription>
                  {financial.singleOutletScope
                    ? "Total POS sales per UTC day for your scope."
                    : "Up to 10 outlets by total sales in range; remaining outlets grouped as Other outlets."}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {financialOutletLineChart.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sales in range.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={financialOutletLineChart.data}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} width={44} />
                      <Tooltip formatter={(v) => formatMoney(Number(v))} />
                      <Legend />
                      {financialOutletLineChart.series.map((s, i) => (
                        <Line
                          key={s.id}
                          type="monotone"
                          dataKey={s.id}
                          name={s.name}
                          stroke={FIN_LINE_COLORS[i % FIN_LINE_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Daily est. net profit vs collection</CardTitle>
                <CardDescription>Estimated profit uses current menu costs (see note above).</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {financialProfitCollectionData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={financialProfitCollectionData}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} width={44} />
                      <Tooltip formatter={(v) => formatMoney(Number(v))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        name="Est. net profit"
                        stroke={FIN_LINE_COLORS[0]}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="collection"
                        name="Collection"
                        stroke={FIN_LINE_COLORS[1]}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-200/80 bg-amber-50/40 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/15">
              <CardContent className="pt-4 text-xs text-muted-foreground leading-relaxed">
                Category revenue sums POS <span className="font-medium text-foreground">menu line</span>{" "}
                totals; direct items are grouped under{" "}
                <span className="font-medium text-foreground">Direct / other</span>. Est. net profit
                excludes COGS for direct lines (same as margin estimate).
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>

      {!skipDashboardStock ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Stock in / out
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Quantities from warehouse and outlet daily movement (UTC calendar days). Scope:{" "}
              <span className="font-medium text-foreground">
                {dashStock?.scopeKind === "Combined"
                  ? "Warehouse + outlet"
                  : dashStock?.scopeKind === "WarehouseOnly"
                    ? "Warehouse"
                    : dashStock?.scopeKind === "OutletOnly"
                      ? "Outlet"
                      : dashStock?.scopeKind ?? "—"}
              </span>
              .
            </p>
          </div>

          {dashStockLoading ? (
            <Card className="border-border shadow-sm">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Loading stock summary…
              </CardContent>
            </Card>
          ) : dashStockIsError ? (
            <Card className="border-destructive/40 shadow-sm">
              <CardContent className="py-6 text-sm text-destructive">
                Could not load stock summary. Check filters and try again.
              </CardContent>
            </Card>
          ) : dashStock && (dashStock.warehouse || dashStock.outlet) ? (
            <div className="space-y-8">
              <div className="flex flex-wrap gap-3 text-sm">
                {dashStock.warehouse && canWarehouseStock ? (
                  <Link
                    href="/reports/warehouse-stock-report"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Full warehouse stock report
                  </Link>
                ) : null}
                {dashStock.outlet ? (
                  <>
                    <Link
                      href="/reports/outlet-daily-stock-report"
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Full outlet daily stock report
                    </Link>
                    {canViewStockRemovals ? (
                      <Link
                        href="/reports/outlet-daily-sheet"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Outlet daily sheet
                      </Link>
                    ) : null}
                  </>
                ) : null}
              </div>

              {dashStock.warehouse ? (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground">
                    Warehouse · {dashStock.warehouseName ?? "—"}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                      title="Stock in (production)"
                      value={formatQty(dashStock.warehouse.totalStockIn)}
                      loading={false}
                    />
                    <KpiCard
                      title="Stock out (transfer + damage)"
                      value={formatQty(dashStock.warehouse.totalStockOut)}
                      loading={false}
                    />
                    <KpiCard
                      title="Net movement"
                      value={formatQty(dashStock.warehouse.netMovement)}
                      loading={false}
                    />
                    <KpiCard
                      title="Closing units (last day)"
                      value={formatQty(dashStock.warehouse.closingStockUnits)}
                      loading={false}
                    />
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="border-border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Warehouse — in vs out by day</CardTitle>
                        <CardDescription>Production in vs transfers + damage out</CardDescription>
                      </CardHeader>
                      <CardContent className="h-72">
                        {dashStock.warehouse.trendByDay.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No movement in this range.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={dashStock.warehouse.trendByDay}
                              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 11 }} width={44} />
                              <Tooltip contentStyle={{ borderRadius: 8 }} />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="stockIn"
                                name="Stock in"
                                stroke={STOCK_IN_COLOR}
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="stockOut"
                                name="Stock out"
                                stroke={STOCK_OUT_COLOR}
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="border-border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Transfer out by outlet</CardTitle>
                        <CardDescription>Total units transferred in range</CardDescription>
                      </CardHeader>
                      <CardContent className="h-72">
                        {dashStock.warehouse.transferOutByOutlet.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No transfers.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              layout="vertical"
                              data={dashStock.warehouse.transferOutByOutlet.map((o) => ({
                                name:
                                  o.outletName.length > 16
                                    ? `${o.outletName.slice(0, 14)}…`
                                    : o.outletName,
                                qty: Math.round(o.quantity * 100) / 100,
                              }))}
                              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis type="number" tick={{ fontSize: 11 }} />
                              <YAxis
                                type="category"
                                dataKey="name"
                                width={96}
                                tick={{ fontSize: 10 }}
                              />
                              <Tooltip formatter={(v) => formatQty(Number(v))} />
                              <Bar dataKey="qty" fill={BAR_FILL} radius={[0, 4, 4, 0]} name="Qty" />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="border-border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Warehouse movement breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Source</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dashStock.warehouse.breakdown.map((r) => (
                            <TableRow key={r.key}>
                              <TableCell>{r.label}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatQty(r.quantity)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              {dashStock.outlet ? (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground">
                    Outlet · {dashStock.outletName ?? "—"}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                      title="Stock in (transfer + purchase)"
                      value={formatQty(dashStock.outlet.totalStockIn)}
                      loading={false}
                    />
                    <KpiCard
                      title="Stock out (sold + loss)"
                      value={formatQty(dashStock.outlet.totalStockOut)}
                      loading={false}
                    />
                    <KpiCard
                      title="Net movement"
                      value={formatQty(dashStock.outlet.netMovement)}
                      loading={false}
                    />
                    <KpiCard
                      title="Closing units (last day)"
                      value={formatQty(dashStock.outlet.closingStockUnits)}
                      loading={false}
                    />
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="border-border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Outlet — in vs out by day</CardTitle>
                        <CardDescription>Transfers/purchases in vs sales and removals out</CardDescription>
                      </CardHeader>
                      <CardContent className="h-72">
                        {dashStock.outlet.trendByDay.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No movement in this range.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={dashStock.outlet.trendByDay}
                              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 11 }} width={44} />
                              <Tooltip contentStyle={{ borderRadius: 8 }} />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="stockIn"
                                name="Stock in"
                                stroke={STOCK_IN_COLOR}
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="stockOut"
                                name="Stock out"
                                stroke={STOCK_OUT_COLOR}
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                    <Card className="border-border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Stock-out composition</CardTitle>
                        <CardDescription>Sold vs damage vs staff (non-sale)</CardDescription>
                      </CardHeader>
                      <CardContent className="h-72">
                        {outletStockOutPie.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No stock-out in this range.</p>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={outletStockOutPie}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={48}
                                outerRadius={88}
                                paddingAngle={2}
                              >
                                {outletStockOutPie.map((entry) => (
                                  <Cell
                                    key={entry.name}
                                    fill={
                                      entry.name === "Sold"
                                        ? COMP_SOLD
                                        : entry.name === "Damage"
                                          ? COMP_DAMAGE
                                          : COMP_STAFF
                                    }
                                  />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v) => formatQty(Number(v))} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  <Card className="border-border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Outlet movement breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Line</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dashStock.outlet.breakdown.map((r) => (
                            <TableRow key={r.key}>
                              <TableCell>{r.label}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatQty(r.quantity)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </div>
          ) : (
            <Card className="border-border shadow-sm">
              <CardContent className="py-6 text-sm text-muted-foreground">
                No stock movement data for this range (empty report).
              </CardContent>
            </Card>
          )}
        </div>
      ) : isSuperAdmin ? (
        <Card className="border-border border-dashed shadow-sm">
          <CardContent className="py-6 text-sm text-muted-foreground">
            Select a <span className="font-medium text-foreground">warehouse</span> and/or an{" "}
            <span className="font-medium text-foreground">outlet</span> in filters to load stock in /
            out charts.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Sales by day</CardTitle>
            <CardDescription>Grand total per UTC day</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {byDay.length === 0 && !salesLoading ? (
              <p className="text-sm text-muted-foreground">No sales in this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={48} />
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v))}
                    labelFormatter={(l) => `Day ${l}`}
                    contentStyle={{ borderRadius: 8 }}
                  />
                  <Bar dataKey="total" name="Sales" fill={BAR_FILL} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Cash vs bank</CardTitle>
            <CardDescription>Share of payment mix (cash + bank)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {pieData.length === 0 && !salesLoading ? (
              <p className="text-sm text-muted-foreground">No payment data in this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {(isSuperAdmin || isWarehouseUser) && byOutlet.length > 1 ? (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Sales by outlet</CardTitle>
            <CardDescription>Comparison across outlets in scope</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={byOutlet}
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Bar dataKey="total" fill={BAR_FILL} radius={[0, 4, 4, 0]} name="Sales" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Activity (counts)</CardTitle>
            <CardDescription>Documents with dates falling in the selected range</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityRows.map((r) => (
                  <TableRow key={r.label}>
                    <TableCell>{r.label}</TableCell>
                    <TableCell className="text-right font-medium">{r.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Top outlets</CardTitle>
            <CardDescription>By grand total in range</CardDescription>
          </CardHeader>
          <CardContent>
            {topOutlets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outlet breakdown.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Outlet</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topOutlets.map((o) => (
                    <TableRow key={o.name}>
                      <TableCell>{o.name}</TableCell>
                      <TableCell className="text-right">{formatMoney(o.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent POS sales</CardTitle>
          <CardDescription>Newest first in the selected range</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Outlet</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">Bank</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No sales.
                  </TableCell>
                </TableRow>
              ) : (
                recentSales.map((s: OutletSaleListItem) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.receiptNo}</TableCell>
                    <TableCell>{s.outletName}</TableCell>
                    <TableCell className="text-right">{formatMoney(s.grandTotal)}</TableCell>
                    <TableCell className="text-right">{formatMoney(s.cashPaidAmount)}</TableCell>
                    <TableCell className="text-right">{formatMoney(s.bankPaidAmount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {sellableOutletId ? (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Sellable stock (current)</CardTitle>
            <CardDescription>On-hand quantities for the selected outlet</CardDescription>
          </CardHeader>
          <CardContent>
            {sellableLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : sellableRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sellable rows.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Sell price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellableRows.slice(0, 20).map((row, idx) => (
                    <TableRow key={`${row.displayName}-${idx}`}>
                      <TableCell>{row.displayName}</TableCell>
                      <TableCell className="text-right">{row.quantityOnHand}</TableCell>
                      <TableCell className="text-right">{formatMoney(row.sellPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Sellable stock</CardTitle>
            <CardDescription>
              Choose an outlet in filters (super admin / warehouse) to preview on-hand sellable
              items.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  loading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        {subtitle ? <p className="text-[10px] text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold tabular-nums text-foreground">
          {loading ? "…" : value}
        </p>
      </CardContent>
    </Card>
  );
}
