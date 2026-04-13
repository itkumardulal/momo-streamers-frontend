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
import {
  useCreateOutletItemPurchaseMutation,
  useGetOutletItemPurchasesQuery,
  useGetOutletItemsQuery,
  useGetOutletsQuery,
  useGetSuppliersQuery,
  useGetOutletItemPurchaseByIdQuery,
} from "@/features/api/apiSlice";
import {
  selectAuthOutletId,
  selectCanUseOutletPurchasePage,
  selectIsSuperAdmin,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";

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
  outletItemId: string;
  supplierId: string;
  quantity: string;
  rate: string;
};

export default function OutletItemPurchasesPage() {
  const canUse = useAppSelector(selectCanUseOutletPurchasePage);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const userOutletId = useAppSelector(selectAuthOutletId);

  const [listOutletFilter, setListOutletFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [createOutletId, setCreateOutletId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIsoDate);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([
    { outletItemId: "", supplierId: "", quantity: "", rate: "" },
  ]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewId, setViewId] = useState<string | null>(null);

  const { data: outletsRes } = useGetOutletsQuery();
  const outlets = outletsRes?.success ? outletsRes.data ?? [] : [];

  const effectiveListOutlet = isSuperAdmin
    ? listOutletFilter || undefined
    : userOutletId ?? undefined;

  const listQueryArg = effectiveListOutlet
    ? { outletId: effectiveListOutlet }
    : undefined;

  const { data: listRes, isLoading, isError, refetch } =
    useGetOutletItemPurchasesQuery(listQueryArg, { skip: !canUse });

  const createOutlet =
    isSuperAdmin && createOutletId
      ? createOutletId
      : userOutletId ?? "";

  const { data: itemsRes } = useGetOutletItemsQuery(undefined, {
    skip: !canUse,
  });
  const { data: supRes } = useGetSuppliersQuery("outlet", { skip: !canUse });
  const outletItems = itemsRes?.success ? itemsRes.data ?? [] : [];
  const suppliers = supRes?.success ? supRes.data ?? [] : [];

  const { data: viewRes, isFetching: viewLoading } =
    useGetOutletItemPurchaseByIdQuery(viewId ?? "", {
      skip: !viewOpen || !viewId,
    });

  const [createPurchase, { isLoading: creating }] =
    useCreateOutletItemPurchaseMutation();

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
    if (!createOutlet) {
      toast.error("Select an outlet");
      return;
    }
    if (!purchaseDate) {
      toast.error("Select a purchase date");
      return;
    }
    const parsed = lines
      .map((l) => ({
        outletItemId: l.outletItemId.trim(),
        supplierId: l.supplierId.trim(),
        quantity: Number(l.quantity),
        ratePerUnit: Number(l.rate),
      }))
      .filter(
        (l) =>
          l.outletItemId &&
          l.supplierId &&
          Number.isFinite(l.quantity) &&
          Number.isFinite(l.ratePerUnit) &&
          l.quantity > 0 &&
          l.ratePerUnit > 0,
      );
    if (parsed.length === 0) {
      toast.error(
        "Add at least one line with outlet item, supplier, quantity, and rate",
      );
      return;
    }
    try {
      const res = await createPurchase({
        purchaseDate,
        notes: notes.trim() ? notes.trim() : null,
        lines: parsed,
        ...(isSuperAdmin ? { outletId: createOutlet } : {}),
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
          { outletItemId: "", supplierId: "", quantity: "", rate: "" },
        ]);
        setCreateOutletId(listOutletFilter || userOutletId || "");
        void refetch();
        return;
      }
      toast.error(res.message ?? "Could not record purchase");
    } catch {
      toast.error("Request failed");
    }
  };

  if (!canUse) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Outlet purchases
        </h2>
        <p className="text-sm text-muted-foreground">
          You do not have access to record outlet direct-item purchases.
        </p>
      </div>
    );
  }

  const rows = listRes?.success ? listRes.data ?? [] : [];
  const viewDetail = viewRes?.success ? viewRes.data : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Outlet purchases
          </h2>
          <p className="text-sm text-muted-foreground">
            Direct retail stock only: each line is an outlet item plus an
            outlet-eligible supplier. Does not affect menu or warehouse raw
            materials.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v) {
              setCreateOutletId(listOutletFilter || userOutletId || "");
              setPurchaseDate(todayIsoDate());
            }
          }}
        >
          <DialogTrigger render={<Button type="button">New purchase</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Record outlet item purchase</DialogTitle>
              <DialogDescription>
                Each line requires a supplier allowed for outlet purchases. Line
                total is quantity × rate.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label>Outlet</Label>
                  <select
                    className={selectClass}
                    value={createOutletId}
                    onChange={(e) => setCreateOutletId(e.target.value)}
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
              <div className="space-y-2">
                <Label htmlFor="oip-date">Purchase date</Label>
                <Input
                  id="oip-date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oip-notes">Notes (optional)</Label>
                <Input
                  id="oip-notes"
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
                          outletItemId: "",
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
                            Outlet item
                          </span>
                          <select
                            className={selectClass}
                            value={line.outletItemId}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLines((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, outletItemId: v } : row,
                                ),
                              );
                            }}
                          >
                            <option value="">Select item</option>
                            {outletItems.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                          <span className="text-xs text-muted-foreground">
                            Supplier
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
            <Label className="text-xs">Outlet</Label>
            <select
              className={cn(selectClass, "max-w-xs")}
              value={listOutletFilter}
              onChange={(e) => setListOutletFilter(e.target.value)}
            >
              <option value="">All</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
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
                  <TableHead>Outlet</TableHead>
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
                      <TableCell>{t.outletName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {t.lineCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(t.grandTotal)}
                      </TableCell>
                      <TableCell className="text-right">
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
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog
        open={viewOpen}
        onOpenChange={(v) => {
          setViewOpen(v);
          if (!v) setViewId(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Outlet purchase</DialogTitle>
            <DialogDescription>
              {viewDetail?.receiptNo ?? (viewLoading ? "Loading…" : "—")}
            </DialogDescription>
          </DialogHeader>
          {viewLoading && !viewDetail && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {viewDetail && (
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Outlet:</span>{" "}
                {viewDetail.outletName}
              </p>
              <p>
                <span className="text-muted-foreground">Purchase date:</span>{" "}
                {formatIsoDateOnly(viewDetail.purchaseDate)}
              </p>
              {viewDetail.notes ? (
                <p>
                  <span className="text-muted-foreground">Notes:</span>{" "}
                  {viewDetail.notes}
                </p>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewDetail.lines.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.outletItemName}</TableCell>
                      <TableCell>{l.supplierName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(l.ratePerUnit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(l.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
