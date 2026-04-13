"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { WarehouseDocumentViewDialog } from "@/components/warehouse-document-view-dialog";
import {
  useCreateWarehouseTransferMutation,
  useGetMenuItemsQuery,
  useGetOutletsQuery,
  useGetWarehouseTransfersQuery,
  useGetWarehousesQuery,
  useLazyGetWarehouseTransferByIdQuery,
} from "@/features/api/apiSlice";
import { printWarehouseTransferDetail } from "@/lib/print-warehouse-document";
import {
  selectAuthWarehouseId,
  selectCanPostWarehouseInventory,
  selectIsSuperAdmin,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { Eye, Printer } from "lucide-react";

function formatAmount(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
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

type LineRow = { menuItemId: string; quantity: string };

export default function WarehouseTransfersPage() {
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const userWarehouseId = useAppSelector(selectAuthWarehouseId);
  const canPost = useAppSelector(selectCanPostWarehouseInventory);

  const [listWarehouseFilter, setListWarehouseFilter] = useState("");
  const [listOutletFilter, setListOutletFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [createWarehouseId, setCreateWarehouseId] = useState("");
  const [createOutletId, setCreateOutletId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([
    { menuItemId: "", quantity: "" },
  ]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const [fetchTransferDetail] = useLazyGetWarehouseTransferByIdQuery();

  const { data: warehousesRes } = useGetWarehousesQuery();
  const warehouses = warehousesRes?.success ? warehousesRes.data ?? [] : [];

  const { data: outletsRes } = useGetOutletsQuery();
  const allOutlets = useMemo(
    () => (outletsRes?.success ? outletsRes.data ?? [] : []),
    [outletsRes],
  );

  const effectiveListWarehouse = isSuperAdmin
    ? listWarehouseFilter || undefined
    : userWarehouseId ?? undefined;

  const listQueryArg = useMemo(() => {
    const arg: { warehouseId?: string; outletId?: string } = {};
    if (effectiveListWarehouse) arg.warehouseId = effectiveListWarehouse;
    if (listOutletFilter) arg.outletId = listOutletFilter;
    return Object.keys(arg).length ? arg : undefined;
  }, [effectiveListWarehouse, listOutletFilter]);

  const { data: transfersRes, isLoading, isError, refetch } =
    useGetWarehouseTransfersQuery(listQueryArg, { skip: !canPost });

  const createWh =
    isSuperAdmin && createWarehouseId
      ? createWarehouseId
      : userWarehouseId ?? "";

  const { data: menuRes } = useGetMenuItemsQuery(createWh || undefined, {
    skip: !open || !createWh,
  });
  const menuItems = menuRes?.success ? menuRes.data ?? [] : [];

  const outletsForCreate = useMemo(() => {
    if (!createWh) return [];
    return allOutlets.filter((o) => o.warehouseId === createWh);
  }, [allOutlets, createWh]);

  const outletsForListFilter = useMemo(() => {
    if (isSuperAdmin && listWarehouseFilter)
      return allOutlets.filter((o) => o.warehouseId === listWarehouseFilter);
    if (!isSuperAdmin && userWarehouseId)
      return allOutlets.filter((o) => o.warehouseId === userWarehouseId);
    return allOutlets;
  }, [isSuperAdmin, listWarehouseFilter, userWarehouseId, allOutlets]);

  const [createTransfer, { isLoading: creating }] =
    useCreateWarehouseTransferMutation();

  const selectClass = cn(
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  const resetCreateForm = () => {
    setCreateOutletId("");
    setNotes("");
    setLines([{ menuItemId: "", quantity: "" }]);
    setCreateWarehouseId(listWarehouseFilter || userWarehouseId || "");
  };

  const onSubmitTransfer = async () => {
    if (!createWh) {
      toast.error("Select a warehouse");
      return;
    }
    if (!createOutletId) {
      toast.error("Select an outlet");
      return;
    }
    const parsed = lines
      .map((l) => ({
        menuItemId: l.menuItemId.trim(),
        quantity: Number(l.quantity),
      }))
      .filter((l) => l.menuItemId && Number.isFinite(l.quantity) && l.quantity > 0);
    if (parsed.length === 0) {
      toast.error("Add at least one line with a menu item and quantity");
      return;
    }
    try {
      const res = await createTransfer({
        outletId: createOutletId,
        notes: notes.trim() ? notes.trim() : null,
        lines: parsed,
        ...(isSuperAdmin ? { warehouseId: createWh } : {}),
      }).unwrap();
      if (res.success && res.data) {
        toast.success(
          res.message
            ? `${res.message} Receipt ${res.data.receiptNo}.`
            : `Receipt ${res.data.receiptNo}`,
        );
        setOpen(false);
        resetCreateForm();
        void refetch();
        return;
      }
      toast.error(res.message ?? "Could not record transfer");
    } catch {
      toast.error("Request failed");
    }
  };

  if (!canPost) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Warehouse transfers
        </h2>
        <p className="text-sm text-muted-foreground">
          You do not have access to warehouse transfers.
        </p>
      </div>
    );
  }

  const transfers = transfersRes?.success ? transfersRes.data ?? [] : [];

  const printRow = async (id: string) => {
    setPrintingId(id);
    try {
      const res = await fetchTransferDetail(id).unwrap();
      if (res.success && res.data) {
        const ok = printWarehouseTransferDetail(res.data);
        if (!ok)
          toast.error("Could not open print window. Allow pop-ups for this site.");
      } else {
        toast.error(res.message ?? "Could not load document for print");
      }
    } catch {
      toast.error("Could not load document for print");
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Warehouse transfers
          </h2>
          <p className="text-sm text-muted-foreground">
            Move multiple menu items from a warehouse to an outlet. Receipt
            numbers are generated per transfer.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v) {
              setCreateWarehouseId(
                listWarehouseFilter || userWarehouseId || "",
              );
            }
          }}
        >
          <DialogTrigger render={<Button type="button">New transfer</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Transfer to outlet</DialogTitle>
              <DialogDescription>
                Stock is removed from the warehouse row and added to the outlet
                stock for each line.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <select
                    className={selectClass}
                    value={createWarehouseId}
                    onChange={(e) => {
                      setCreateWarehouseId(e.target.value);
                      setCreateOutletId("");
                    }}
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
              <div className="space-y-2">
                <Label>Outlet</Label>
                <select
                  className={selectClass}
                  value={createOutletId}
                  onChange={(e) => setCreateOutletId(e.target.value)}
                  disabled={!createWh}
                >
                  <option value="">Select outlet</option>
                  {outletsForCreate.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wt-notes">Notes (optional)</Label>
                <Input
                  id="wt-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={2000}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Lines</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setLines((prev) => [...prev, { menuItemId: "", quantity: "" }])
                    }
                  >
                    Add line
                  </Button>
                </div>
                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_100px_auto]"
                    >
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          Menu item
                        </span>
                        <select
                          className={selectClass}
                          value={line.menuItemId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, menuItemId: v } : r,
                              ),
                            );
                          }}
                          disabled={!createWh}
                        >
                          <option value="">Select</option>
                          {menuItems.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} (WH: {formatAmount(m.quantityOnHand)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          Qty
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, quantity: v } : r,
                              ),
                            );
                          }}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={lines.length <= 1}
                          onClick={() =>
                            setLines((prev) => prev.filter((_, i) => i !== idx))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={creating}
                onClick={() => void onSubmitTransfer()}
              >
                {creating ? "Saving…" : "Record transfer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">History</h3>
        <div className="flex flex-wrap items-end gap-3">
          {isSuperAdmin && (
            <div className="space-y-1">
              <Label className="text-xs">Warehouse</Label>
              <select
                className={cn(selectClass, "min-w-[180px]")}
                value={listWarehouseFilter}
                onChange={(e) => {
                  setListWarehouseFilter(e.target.value);
                  setListOutletFilter("");
                }}
              >
                <option value="">All</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Outlet</Label>
            <select
              className={cn(selectClass, "min-w-[180px]")}
              value={listOutletFilter}
              onChange={(e) => setListOutletFilter(e.target.value)}
            >
              <option value="">All</option>
              {outletsForListFilter.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {isError && (
          <p className="text-sm text-destructive">Could not load transfers.</p>
        )}
        {!isLoading && !isError && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Outlet</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Total qty</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No transfers yet.
                  </TableCell>
                </TableRow>
              ) : (
                transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">
                      {t.receiptNo}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(t.createdAt)}
                    </TableCell>
                    <TableCell>{t.warehouseName}</TableCell>
                    <TableCell>{t.outletName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.lineCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(t.totalQuantity)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="View"
                          onClick={() => {
                            setViewId(t.id);
                            setViewOpen(true);
                          }}
                        >
                          <Eye />
                          <span className="sr-only">View</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="Print"
                          disabled={printingId === t.id}
                          onClick={() => void printRow(t.id)}
                        >
                          <Printer />
                          <span className="sr-only">Print</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <WarehouseDocumentViewDialog
        kind="transfer"
        documentId={viewId}
        open={viewOpen}
        onOpenChange={(v) => {
          setViewOpen(v);
          if (!v) setViewId(null);
        }}
      />
    </div>
  );
}
