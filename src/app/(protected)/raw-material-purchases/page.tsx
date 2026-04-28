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
  useCreateRawMaterialPurchaseMutation,
  useGetRawMaterialItemsQuery,
  useGetRawMaterialPurchasesQuery,
  useGetSuppliersQuery,
  useGetWarehousesQuery,
  useLazyGetRawMaterialPurchaseByIdQuery,
} from "@/features/api/apiSlice";
import { printRawMaterialPurchaseDetail } from "@/lib/print-warehouse-document";
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

function formatIsoDateOnly(isoDate: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    try {
      const [y, m, d] = isoDate.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return isoDate;
    }
  }
  return isoDate;
}

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lineTotal(qty: number, rate: number) {
  return Math.round(qty * rate * 100) / 100;
}

type LineRow = {
  rawMaterialItemId: string;
  supplierId: string;
  quantity: string;
  rate: string;
};

export default function RawMaterialPurchasesPage() {
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const userWarehouseId = useAppSelector(selectAuthWarehouseId);
  const canPost = useAppSelector(selectCanPostWarehouseInventory);

  const [listWarehouseFilter, setListWarehouseFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [createWarehouseId, setCreateWarehouseId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIsoDate);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([
    { rawMaterialItemId: "", supplierId: "", quantity: "", rate: "" },
  ]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const [fetchPurchaseDetail] = useLazyGetRawMaterialPurchaseByIdQuery();

  const { data: warehousesRes } = useGetWarehousesQuery();
  const warehouses = warehousesRes?.success ? warehousesRes.data ?? [] : [];

  const effectiveListWarehouse = isSuperAdmin
    ? listWarehouseFilter || undefined
    : userWarehouseId ?? undefined;

  const listQueryArg = effectiveListWarehouse
    ? { warehouseId: effectiveListWarehouse }
    : undefined;

  const { data: listRes, isLoading, isError, refetch } =
    useGetRawMaterialPurchasesQuery(listQueryArg, { skip: !canPost });

  const createWh =
    isSuperAdmin && createWarehouseId
      ? createWarehouseId
      : userWarehouseId ?? "";

  const { data: rmRes } = useGetRawMaterialItemsQuery();
  const { data: supRes } = useGetSuppliersQuery("warehouse");
  const rawMaterials = rmRes?.success ? rmRes.data ?? [] : [];
  const suppliers = supRes?.success ? supRes.data ?? [] : [];

  const [createPurchase, { isLoading: creating }] =
    useCreateRawMaterialPurchaseMutation();

  const selectClass = cn(
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  const grandPreview = useMemo(() => {
    let s = 0;
    for (const l of lines) {
      const q = Number(l.quantity);
      const r = Number(l.rate);
      if (Number.isFinite(q) && Number.isFinite(r) && q > 0 && r > 0)
        s += lineTotal(q, r);
    }
    return Math.round(s * 100) / 100;
  }, [lines]);

  const onSubmit = async () => {
    if (!createWh) {
      toast.error("Select a warehouse");
      return;
    }
    if (!purchaseDate) {
      toast.error("Select a purchase date");
      return;
    }
    const parsed = lines
      .map((l) => ({
        rawMaterialItemId: l.rawMaterialItemId.trim(),
        supplierId: l.supplierId.trim(),
        quantity: Number(l.quantity),
        ratePerUnit: Number(l.rate),
      }))
      .filter(
        (l) =>
          l.rawMaterialItemId &&
          l.supplierId &&
          Number.isFinite(l.quantity) &&
          Number.isFinite(l.ratePerUnit) &&
          l.quantity > 0 &&
          l.ratePerUnit > 0,
      );
    if (parsed.length === 0) {
      toast.error(
        "Add at least one line with raw material, supplier, quantity, and rate",
      );
      return;
    }
    try {
      const res = await createPurchase({
        purchaseDate,
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
        setPurchaseDate(todayIsoDate());
        setLines([
          { rawMaterialItemId: "", supplierId: "", quantity: "", rate: "" },
        ]);
        setCreateWarehouseId(listWarehouseFilter || userWarehouseId || "");
        void refetch();
        return;
      }
      toast.error(res.message ?? "Could not record purchase");
    } catch {
      toast.error("Request failed");
    }
  };

  if (!canPost) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Raw material purchases
        </h2>
        <p className="text-sm text-muted-foreground">
          You do not have access to record warehouse purchases.
        </p>
      </div>
    );
  }

  const rows = listRes?.success ? listRes.data ?? [] : [];

  const printRow = async (id: string) => {
    setPrintingId(id);
    try {
      const res = await fetchPurchaseDetail(id).unwrap();
      if (res.success && res.data) {
        const ok = printRawMaterialPurchaseDetail(res.data);
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
            Raw material purchases
          </h2>
          <p className="text-sm text-muted-foreground">
            Record multiple raw materials per receipt, with supplier, quantity,
            and rate. Purchase date is the business date of the buy.
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
              setPurchaseDate(todayIsoDate());
            }
          }}
        >
          <DialogTrigger render={<Button type="button">New purchase</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record raw material purchase</DialogTitle>
              <DialogDescription>
                Each line requires a supplier. Line total is quantity × rate.
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
                <Label htmlFor="rmp-date">Purchase date</Label>
                <Input
                  id="rmp-date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rmp-notes">Notes (optional)</Label>
                <Input
                  id="rmp-notes"
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
                        {
                          rawMaterialItemId: "",
                          supplierId: "",
                          quantity: "",
                          rate: "",
                        },
                      ])
                    }
                  >
                    Add line
                  </Button>
                </div>
                <div className="space-y-3">
                  {lines.map((line, idx) => {
                    const q = Number(line.quantity);
                    const r = Number(line.rate);
                    const rowTot =
                      Number.isFinite(q) &&
                      Number.isFinite(r) &&
                      q > 0 &&
                      r > 0
                        ? lineTotal(q, r)
                        : null;
                    return (
                      <div
                        key={idx}
                        className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_88px_88px_100px_auto]"
                      >
                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                          <span className="text-xs text-muted-foreground">
                            Item
                          </span>
                          <select
                            className={selectClass}
                            value={line.rawMaterialItemId}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLines((prev) =>
                                prev.map((row, i) =>
                                  i === idx
                                    ? { ...row, rawMaterialItemId: v }
                                    : row,
                                ),
                              );
                            }}
                          >
                            <option value="">Select raw material</option>
                            {rawMaterials.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                          <span className="text-xs text-muted-foreground">
                            Purchased from
                          </span>
                          <select
                            className={selectClass}
                            value={line.supplierId}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLines((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, supplierId: v } : row,
                                ),
                              );
                            }}
                          >
                            <option value="">Select supplier</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">
                            Quantity
                          </span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLines((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, quantity: v } : row,
                                ),
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">
                            Rate
                          </span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.rate}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLines((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, rate: v } : row,
                                ),
                              );
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">
                            Line total
                          </span>
                          <div className="flex h-9 items-center rounded-lg border border-border bg-muted/40 px-2.5 text-sm tabular-nums">
                            {rowTot !== null ? formatAmount(rowTot) : "—"}
                          </div>
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={lines.length <= 1}
                            onClick={() =>
                              setLines((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-right text-sm font-medium tabular-nums">
                  Document total: {formatAmount(grandPreview)}
                </p>
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
                {creating ? "Saving…" : "Save purchase"}
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
          <p className="text-sm text-destructive">Could not load purchases.</p>
        )}
        {!isLoading && !isError && (
          <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Purchase date</TableHead>
                  <TableHead>Recorded</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Grand total</TableHead>
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      No purchases yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-sm">
                        {t.receiptNo}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatIsoDateOnly(t.purchaseDate)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDateTime(t.createdAt)}
                      </TableCell>
                      <TableCell>{t.warehouseName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.lineCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(t.grandTotal)}
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
          </div>
        )}
      </div>

      <WarehouseDocumentViewDialog
        kind="rawPurchase"
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
