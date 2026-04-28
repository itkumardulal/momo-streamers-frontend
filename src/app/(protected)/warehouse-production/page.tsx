"use client";

import { useState } from "react";
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
  useCreateWarehouseProductionMutation,
  useGetMenuItemsQuery,
  useGetWarehouseProductionsQuery,
  useGetWarehousesQuery,
  useLazyGetWarehouseProductionByIdQuery,
} from "@/features/api/apiSlice";
import { printWarehouseProductionDetail } from "@/lib/print-warehouse-document";
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

type LineRow = { menuItemId: string; quantity: string; damage: string };

export default function WarehouseProductionPage() {
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const userWarehouseId = useAppSelector(selectAuthWarehouseId);
  const canPost = useAppSelector(selectCanPostWarehouseInventory);

  const [listWarehouseFilter, setListWarehouseFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [createWarehouseId, setCreateWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([
    { menuItemId: "", quantity: "", damage: "" },
  ]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const [fetchProductionDetail] = useLazyGetWarehouseProductionByIdQuery();

  const { data: warehousesRes } = useGetWarehousesQuery();
  const warehouses = warehousesRes?.success ? warehousesRes.data ?? [] : [];

  const effectiveListWarehouse = isSuperAdmin
    ? listWarehouseFilter || undefined
    : userWarehouseId ?? undefined;

  const listQueryArg = effectiveListWarehouse
    ? { warehouseId: effectiveListWarehouse }
    : undefined;

  const { data: prodsRes, isLoading, isError, refetch } =
    useGetWarehouseProductionsQuery(listQueryArg, { skip: !canPost });

  const createWh =
    isSuperAdmin && createWarehouseId
      ? createWarehouseId
      : userWarehouseId ?? "";

  const { data: menuRes } = useGetMenuItemsQuery(createWh || undefined, {
    skip: !open || !createWh,
  });
  const menuItems = menuRes?.success ? menuRes.data ?? [] : [];

  const [createProduction, { isLoading: creating }] =
    useCreateWarehouseProductionMutation();

  const selectClass = cn(
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  const onSubmit = async () => {
    if (!createWh) {
      toast.error("Select a warehouse");
      return;
    }
    const parsed = lines
      .map((l) => ({
        menuItemId: l.menuItemId.trim(),
        quantity: Number(l.quantity),
        damageQuantity: l.damage.trim() === "" ? 0 : Number(l.damage),
      }))
      .filter((l) => {
        if (!l.menuItemId) return false;
        const qOk = Number.isFinite(l.quantity) && l.quantity >= 0;
        const dOk = Number.isFinite(l.damageQuantity) && l.damageQuantity >= 0;
        return qOk && dOk && (l.quantity > 0 || l.damageQuantity > 0);
      });
    if (parsed.length === 0) {
      toast.error(
        "Add at least one line with a menu item and a good quantity and/or damage quantity",
      );
      return;
    }
    try {
      const res = await createProduction({
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
        setNotes("");
        setLines([{ menuItemId: "", quantity: "", damage: "" }]);
        setCreateWarehouseId(listWarehouseFilter || userWarehouseId || "");
        void refetch();
        return;
      }
      toast.error(res.message ?? "Could not record production");
    } catch {
      toast.error("Request failed");
    }
  };

  if (!canPost) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Warehouse production
        </h2>
        <p className="text-sm text-muted-foreground">
          You do not have access to warehouse production.
        </p>
      </div>
    );
  }

  const rows = prodsRes?.success ? prodsRes.data ?? [] : [];

  const printRow = async (id: string) => {
    setPrintingId(id);
    try {
      const res = await fetchProductionDetail(id).unwrap();
      if (res.success && res.data) {
        const ok = printWarehouseProductionDetail(res.data);
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
            Warehouse production
          </h2>
          <p className="text-sm text-muted-foreground">
            Record good output (increases stock) and optional damage (decreases
            stock) per menu item. Each run gets a receipt number.
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
          <DialogTrigger render={<Button type="button">New production</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record production</DialogTitle>
              <DialogDescription>
                Good quantity increases warehouse stock; damage reduces it (same
                receipt).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label>Warehouse</Label>
                  <select
                    className={selectClass}
                    value={createWarehouseId}
                    onChange={(e) => setCreateWarehouseId(e.target.value)}
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
                <Label htmlFor="wp-notes">Notes (optional)</Label>
                <Input
                  id="wp-notes"
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
                      setLines((prev) => [
                        ...prev,
                        { menuItemId: "", quantity: "", damage: "" },
                      ])
                    }
                  >
                    Add line
                  </Button>
                </div>
                <div className="space-y-3">
                  {lines.map((line, idx) => (
                    <div
                      key={idx}
                      className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_88px_88px_auto]"
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
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          Good
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
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">
                          Damage
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.damage}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, damage: v } : r,
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
                onClick={() => void onSubmit()}
              >
                {creating ? "Saving…" : "Record production"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">History</h3>
        {isSuperAdmin && (
          <div className="space-y-1">
            <Label className="text-xs">Warehouse</Label>
            <select
              className={cn(selectClass, "max-w-xs")}
              value={listWarehouseFilter}
              onChange={(e) => setListWarehouseFilter(e.target.value)}
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
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {isError && (
          <p className="text-sm text-destructive">Could not load production.</p>
        )}
        {!isLoading && !isError && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Total good</TableHead>
                <TableHead className="text-right">Total damage</TableHead>
                <TableHead className="w-[1%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No production entries yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">
                      {t.receiptNo}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(t.createdAt)}
                    </TableCell>
                    <TableCell>{t.warehouseName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.lineCount}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(t.totalQuantity)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(t.totalDamageQuantity ?? 0)}
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
        kind="production"
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
