"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  useCreateOutletStockRemovalMutation,
  useGetOutletSellableStockQuery,
  useGetOutletStockRemovalsQuery,
  useGetOutletsQuery,
} from "@/features/api/apiSlice";
import type { CreateOutletStockRemovalLine } from "@/entities/types";
import {
  OutletStockRemovalReason,
  OutletStockSource,
} from "@/entities/types";
import {
  selectAuthOutletId,
  selectAuthWarehouseId,
  selectCanUseOutletPos,
  selectCanViewOutletStockRemovals,
  selectIsSuperAdmin,
  selectIsWarehouseUser,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

function formatDatetimeLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function reasonLabel(r: OutletStockRemovalReason) {
  switch (r) {
    case OutletStockRemovalReason.Damage:
      return "Damage";
    case OutletStockRemovalReason.StaffUse:
      return "Staff use";
    default:
      return String(r);
  }
}

type CartLine =
  | {
      key: string;
      source: OutletStockSource.Warehouse;
      menuItemId: string;
      name: string;
      qty: number;
      maxQty: number;
    }
  | {
      key: string;
      source: OutletStockSource.Direct;
      outletItemId: string;
      name: string;
      qty: number;
      maxQty: number;
    };

export default function OutletStockRemovalsPage() {
  const canView = useAppSelector(selectCanViewOutletStockRemovals);
  const canPost = useAppSelector(selectCanUseOutletPos);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const isWarehouseUser = useAppSelector(selectIsWarehouseUser);
  const userOutletId = useAppSelector(selectAuthOutletId);
  const userWarehouseId = useAppSelector(selectAuthWarehouseId);

  const { data: outletsRes } = useGetOutletsQuery();
  const outlets = useMemo(
    () => (outletsRes?.success ? outletsRes.data ?? [] : []),
    [outletsRes],
  );

  const warehouseOutlets = useMemo(() => {
    if (!isWarehouseUser || !userWarehouseId) return [];
    return outlets.filter((o) => o.warehouseId === userWarehouseId);
  }, [isWarehouseUser, outlets, userWarehouseId]);

  const [pickOutletId, setPickOutletId] = useState("");

  useEffect(() => {
    if (!isWarehouseUser || warehouseOutlets.length === 0) return;
    setPickOutletId((prev) => {
      if (prev && warehouseOutlets.some((o) => o.id === prev)) return prev;
      return warehouseOutlets[0]?.id ?? "";
    });
  }, [isWarehouseUser, warehouseOutlets]);

  const effectiveOutletId = isSuperAdmin
    ? pickOutletId || ""
    : isWarehouseUser
      ? pickOutletId || ""
      : userOutletId ?? "";

  const { data: stockRes, isFetching: stockLoading, refetch: refetchStock } =
    useGetOutletSellableStockQuery(
      effectiveOutletId ? effectiveOutletId : undefined,
      { skip: !canView || !effectiveOutletId },
    );

  const listArg =
    canView && (isSuperAdmin || isWarehouseUser || userOutletId)
      ? {
          outletId:
            isSuperAdmin || isWarehouseUser
              ? effectiveOutletId || undefined
              : userOutletId || undefined,
        }
      : undefined;

  const { data: removalsRes, isFetching: removalsLoading } =
    useGetOutletStockRemovalsQuery(listArg, {
      skip: !canView || (!effectiveOutletId && !isSuperAdmin && !isWarehouseUser),
    });

  const [cart, setCart] = useState<CartLine[]>([]);
  const [entryLocal, setEntryLocal] = useState(() => formatDatetimeLocal(new Date()));
  const [reason, setReason] = useState<OutletStockRemovalReason>(
    OutletStockRemovalReason.Damage,
  );
  const [notes, setNotes] = useState("");
  const [createRemoval, { isLoading: submitting }] =
    useCreateOutletStockRemovalMutation();

  const stockRows = stockRes?.success ? stockRes.data ?? [] : [];
  const removalRows = removalsRes?.success ? removalsRes.data ?? [] : [];

  const addFromStock = (row: (typeof stockRows)[number]) => {
    if (row.source === OutletStockSource.Warehouse) {
      const id = row.menuItemId;
      if (!id) return;
      const key = `w-${id}`;
      setCart((prev) => {
        const idx = prev.findIndex(
          (c) => c.source === OutletStockSource.Warehouse && c.menuItemId === id,
        );
        if (idx >= 0) {
          return prev.map((c, i) =>
            i === idx
              ? { ...c, qty: Math.min(c.maxQty, c.qty + 1) }
              : c,
          );
        }
        return [
          ...prev,
          {
            key,
            source: OutletStockSource.Warehouse,
            menuItemId: id,
            name: row.displayName,
            qty: 1,
            maxQty: row.quantityOnHand,
          },
        ];
      });
      return;
    }
    const oid = row.outletItemId;
    if (!oid) return;
    const key = `d-${oid}`;
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) => c.source === OutletStockSource.Direct && c.outletItemId === oid,
      );
      if (idx >= 0) {
        return prev.map((c, i) =>
          i === idx ? { ...c, qty: Math.min(c.maxQty, c.qty + 1) } : c,
        );
      }
      return [
        ...prev,
        {
          key,
          source: OutletStockSource.Direct,
          outletItemId: oid,
          name: row.displayName,
          qty: 1,
          maxQty: row.quantityOnHand,
        },
      ];
    });
  };

  const updateCartQty = (key: string, qty: number) => {
    setCart((prev) =>
      prev.map((c) => (c.key === key ? { ...c, qty } as CartLine : c)),
    );
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const anyOverStock = cart.some((c) => c.qty > c.maxQty + 1e-9);

  const onSubmit = useCallback(async () => {
    if (!effectiveOutletId) {
      toast.error("Select an outlet");
      return;
    }
    if (!entryLocal.trim()) {
      toast.error("Entry date and time are required");
      return;
    }
    const entryAtUtc = new Date(entryLocal);
    if (Number.isNaN(entryAtUtc.getTime())) {
      toast.error("Invalid entry date");
      return;
    }
    const lines: CreateOutletStockRemovalLine[] = [];
    for (const c of cart) {
      if (c.source === OutletStockSource.Warehouse) {
        lines.push({
          stockSource: OutletStockSource.Warehouse,
          menuItemId: c.menuItemId,
          outletItemId: null,
          quantity: c.qty,
        });
      } else {
        lines.push({
          stockSource: OutletStockSource.Direct,
          menuItemId: null,
          outletItemId: c.outletItemId,
          quantity: c.qty,
        });
      }
    }
    const validLines = lines.filter(
      (l) =>
        Number.isFinite(l.quantity) &&
        l.quantity > 0 &&
        ((l.stockSource === OutletStockSource.Warehouse && l.menuItemId) ||
          (l.stockSource === OutletStockSource.Direct && l.outletItemId)),
    );
    if (validLines.length === 0) {
      toast.error("Add at least one line with quantity");
      return;
    }
    if (anyOverStock) {
      toast.error("Quantities cannot exceed on-hand stock");
      return;
    }
    try {
      const res = await createRemoval({
        entryAtUtc: entryAtUtc.toISOString(),
        reason,
        notes: notes.trim() ? notes.trim() : null,
        lines: validLines,
        ...(isSuperAdmin || isWarehouseUser ? { outletId: effectiveOutletId } : {}),
      }).unwrap();
      if (res.success && res.data) {
        toast.success(
          res.message
            ? `${res.message} ${res.data.receiptNo}.`
            : `Recorded ${res.data.receiptNo}`,
        );
        setCart([]);
        setNotes("");
        setEntryLocal(formatDatetimeLocal(new Date()));
        void refetchStock();
        return;
      }
      toast.error(res.message ?? "Could not record removal");
    } catch {
      toast.error("Request failed");
    }
  }, [
    anyOverStock,
    cart,
    createRemoval,
    effectiveOutletId,
    entryLocal,
    isSuperAdmin,
    isWarehouseUser,
    notes,
    reason,
    refetchStock,
  ]);

  if (!canView) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Stock removals</h2>
        <p className="text-sm text-muted-foreground">
          You do not have access to outlet stock removals.
        </p>
      </div>
    );
  }

  const selectClass = cn(
    "flex h-9 w-full max-w-xs rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Stock removals</h2>
        <p className="text-sm text-muted-foreground">
          Record damaged goods or internal use (for example staff lunch). Choose
          the entry date for when it happened; stock is reduced when you save.
          {canPost ? "" : " Your role can view history only; outlet staff records removals."}
        </p>
      </div>

      {isSuperAdmin && (
        <div className="space-y-2">
          <Label>Outlet</Label>
          <select
            className={selectClass}
            value={pickOutletId}
            onChange={(e) => {
              setPickOutletId(e.target.value);
              setCart([]);
            }}
          >
            <option value="">All outlets (list) / pick for entry</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Select an outlet to load stock and record removals. Leave empty to
            list removals for every outlet.
          </p>
        </div>
      )}

      {isWarehouseUser && (
        <div className="space-y-2">
          <Label>Outlet</Label>
          <select
            className={selectClass}
            value={pickOutletId}
            onChange={(e) => {
              setPickOutletId(e.target.value);
              setCart([]);
            }}
          >
            {warehouseOutlets.length === 0 ? (
              <option value="">No outlets in your warehouse</option>
            ) : (
              warehouseOutlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))
            )}
          </select>
        </div>
      )}

      {!effectiveOutletId ? (
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin
            ? "Pick an outlet above to load sellable stock and record removals."
            : isWarehouseUser
              ? "No outlet available for your warehouse."
              : "Your account is not linked to an outlet."}
        </p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Sellable stock</h3>
            {stockLoading && (
              <p className="text-sm text-muted-foreground">Loading stock…</p>
            )}
            {!stockLoading && stockRows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No positive on-hand rows for this outlet.
              </p>
            )}
            {!stockLoading && stockRows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">On hand</TableHead>
                      <TableHead className="w-[1%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockRows.map((r, i) => (
                      <TableRow key={`${r.source}-${r.menuItemId ?? r.outletItemId ?? i}`}>
                        <TableCell className="font-medium">{r.displayName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {r.source === OutletStockSource.Warehouse
                            ? "Menu (warehouse)"
                            : "Direct"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.quantityOnHand}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={!canPost}
                            onClick={() => addFromStock(r)}
                          >
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Removal entry</h3>
            <div className="space-y-3 rounded-lg border border-border bg-white p-4 shadow-sm">
              <div className="space-y-2">
                <Label htmlFor="entryAt">Entry date &amp; time</Label>
                <Input
                  id="entryAt"
                  type="datetime-local"
                  value={entryLocal}
                  disabled={!canPost}
                  onChange={(e) => setEntryLocal(e.target.value)}
                  className="max-w-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <select
                  id="reason"
                  className={selectClass}
                  disabled={!canPost}
                  value={reason}
                  onChange={(e) =>
                    setReason(Number(e.target.value) as OutletStockRemovalReason)
                  }
                >
                  <option value={OutletStockRemovalReason.Damage}>Damage</option>
                  <option value={OutletStockRemovalReason.StaffUse}>
                    Staff use / lunch
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  disabled={!canPost}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Details"
                />
              </div>

              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {canPost
                    ? "Add lines from the stock list."
                    : "View-only: removals are entered by outlet staff."}
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Lines</p>
                  <ul className="space-y-2">
                    {cart.map((line) => (
                      <li
                        key={line.key}
                        className="flex flex-wrap items-center gap-2 border-b border-border pb-2 text-sm"
                      >
                        <span className="min-w-0 flex-1 font-medium">{line.name}</span>
                        <Input
                          type="number"
                          className="h-8 w-20"
                          disabled={!canPost}
                          min={0.01}
                          step={0.01}
                          value={line.qty}
                          onChange={(e) =>
                            updateCartQty(line.key, Number(e.target.value))
                          }
                        />
                        {canPost && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(line.key)}
                          >
                            Remove
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {canPost && (
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={submitting || cart.length === 0 || anyOverStock}
                  onClick={() => void onSubmit()}
                >
                  {submitting ? "Saving…" : "Save removal"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Recent removals</h3>
        {removalsLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!removalsLoading && removalRows.length === 0 && (
          <p className="text-sm text-muted-foreground">No removals in this scope.</p>
        )}
        {!removalsLoading && removalRows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {removalRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.receiptNo}</TableCell>
                    <TableCell>{r.outletName}</TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(r.entryAtUtc)}
                    </TableCell>
                    <TableCell>{reasonLabel(r.reason)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.lineCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
