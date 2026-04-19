"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  RawMaterialPurchaseDetail,
  WarehouseProductionDetail,
  WarehouseTransferDetail,
} from "@/entities/types";
import {
  useGetRawMaterialPurchaseByIdQuery,
  useGetWarehouseProductionByIdQuery,
  useGetWarehouseTransferByIdQuery,
} from "@/features/api/apiSlice";
import {
  printRawMaterialPurchaseDetail,
  printWarehouseProductionDetail,
  printWarehouseTransferDetail,
} from "@/lib/print-warehouse-document";
import { Printer } from "lucide-react";
import { toast } from "sonner";

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

type Kind = "production" | "transfer" | "rawPurchase";

type Props = {
  kind: Kind;
  documentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WarehouseDocumentViewDialog({
  kind,
  documentId,
  open,
  onOpenChange,
}: Props) {
  const skip = !open || !documentId;

  const prod = useGetWarehouseProductionByIdQuery(documentId ?? "", {
    skip: skip || kind !== "production",
  });
  const xfer = useGetWarehouseTransferByIdQuery(documentId ?? "", {
    skip: skip || kind !== "transfer",
  });
  const purchase = useGetRawMaterialPurchaseByIdQuery(documentId ?? "", {
    skip: skip || kind !== "rawPurchase",
  });

  const loading =
    kind === "production"
      ? prod.isLoading || prod.isFetching
      : kind === "transfer"
        ? xfer.isLoading || xfer.isFetching
        : purchase.isLoading || purchase.isFetching;
  const err =
    kind === "production"
      ? prod.isError
      : kind === "transfer"
        ? xfer.isError
        : purchase.isError;
  const res =
    kind === "production"
      ? prod.data
      : kind === "transfer"
        ? xfer.data
        : purchase.data;
  const detail = res?.success && res.data ? res.data : null;
  const message = res && !res.success ? res.message : null;

  const onPrint = () => {
    if (!detail) return;
    if (kind === "production") {
      const ok = printWarehouseProductionDetail(detail as WarehouseProductionDetail);
      if (!ok)
        toast.error("Could not open print window. Allow pop-ups for this site.");
    } else if (kind === "transfer") {
      const ok = printWarehouseTransferDetail(detail as WarehouseTransferDetail);
      if (!ok)
        toast.error("Could not open print window. Allow pop-ups for this site.");
    } else {
      const ok = printRawMaterialPurchaseDetail(detail as RawMaterialPurchaseDetail);
      if (!ok)
        toast.error("Could not open print window. Allow pop-ups for this site.");
    }
  };

  const title =
    kind === "production"
      ? "Production receipt"
      : kind === "transfer"
        ? "Transfer receipt"
        : "Raw material purchase";

  const rawDetail = detail as RawMaterialPurchaseDetail | null;
  const grandTotal =
    kind === "rawPurchase" && rawDetail?.lines?.length
      ? rawDetail.lines.reduce((s, l) => s + l.lineTotal, 0)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[95vw] overflow-y-auto sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            View only — lines and quantities as recorded.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!loading && err && (
          <p className="text-sm text-destructive">Could not load this document.</p>
        )}
        {!loading && !err && message && (
          <p className="text-sm text-destructive">{message}</p>
        )}
        {!loading && !err && detail && (
          <div className="space-y-3 text-sm">
            <div className="grid gap-1 rounded-lg border border-border p-3">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Receipt</span>
                <span className="font-mono font-medium">{detail.receiptNo}</span>
              </div>
              {kind === "rawPurchase" && rawDetail && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Purchase date</span>
                  <span>{formatIsoDateOnly(rawDetail.purchaseDate)}</span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {kind === "rawPurchase" ? "Recorded" : "Date"}
                </span>
                <span>{formatDate(detail.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Warehouse</span>
                <span>{detail.warehouseName}</span>
              </div>
              {kind === "transfer" && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Outlet</span>
                  <span>
                    {(detail as WarehouseTransferDetail).outletName}
                  </span>
                </div>
              )}
              {kind === "rawPurchase" && rawDetail && (
                <div className="flex justify-between gap-2 border-t border-border pt-2">
                  <span className="text-muted-foreground">Grand total</span>
                  <span className="tabular-nums font-medium">
                    {formatAmount(grandTotal)}
                  </span>
                </div>
              )}
              {detail.notes?.trim() && (
                <div className="border-t border-border pt-2">
                  <span className="text-muted-foreground">Notes</span>
                  <p className="mt-1 whitespace-pre-wrap">{detail.notes.trim()}</p>
                </div>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {kind === "rawPurchase" ? (
                    <>
                      <TableHead>Item</TableHead>
                      <TableHead>Purchased from</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Good qty</TableHead>
                      {kind === "production" && (
                        <TableHead className="text-right">Damage</TableHead>
                      )}
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.lines.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        kind === "rawPurchase" ? 5 : kind === "production" ? 3 : 2
                      }
                      className="text-muted-foreground"
                    >
                      No lines.
                    </TableCell>
                  </TableRow>
                ) : kind === "rawPurchase" ? (
                  rawDetail!.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.rawMaterialItemName}</TableCell>
                      <TableCell>{line.supplierName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(line.quantity)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(line.ratePerUnit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(line.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : kind === "production" ? (
                  (detail as WarehouseProductionDetail).lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.menuItemName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(line.quantity)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(line.damageQuantity ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  (detail as WarehouseTransferDetail).lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.menuItemName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatAmount(line.quantity)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!detail}
            onClick={() => onPrint()}
          >
            <Printer />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
