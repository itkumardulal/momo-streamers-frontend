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
  useCreateOutletSaleMutation,
  useGetOutletSalesQuery,
  useGetOutletSellableStockQuery,
  useGetOutletsQuery,
} from "@/features/api/apiSlice";
import { OutletStockSource } from "@/entities/types";
import {
  selectAuthOutletId,
  selectCanUseOutletPos,
  selectIsSuperAdmin,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

function formatAmount(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseMoneyInput(str: string) {
  const t = str.trim();
  if (t === "") return { amount: 0, invalid: false };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { amount: 0, invalid: true };
  return { amount: Math.round(n * 100) / 100, invalid: false };
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

type CartLine =
  | {
      key: string;
      source: OutletStockSource.Warehouse;
      menuItemId: string;
      name: string;
      unitPrice: number;
      qty: number;
      maxQty: number;
    }
  | {
      key: string;
      source: OutletStockSource.Direct;
      outletItemId: string;
      name: string;
      unitPrice: number;
      qty: number;
      maxQty: number;
    };

export default function OutletSalesPage() {
  const canUse = useAppSelector(selectCanUseOutletPos);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const userOutletId = useAppSelector(selectAuthOutletId);

  const { data: outletsRes } = useGetOutletsQuery();
  const outlets = outletsRes?.success ? outletsRes.data ?? [] : [];

  const [posOutletId, setPosOutletId] = useState("");
  const effectiveOutletId = isSuperAdmin
    ? posOutletId || ""
    : userOutletId ?? "";

  const { data: stockRes, isFetching: stockLoading, refetch: refetchStock } =
    useGetOutletSellableStockQuery(
      effectiveOutletId ? effectiveOutletId : undefined,
      { skip: !canUse || !effectiveOutletId },
    );

  const listArg = effectiveOutletId ? { outletId: effectiveOutletId } : undefined;
  const { data: salesRes, isLoading: salesLoading } = useGetOutletSalesQuery(
    listArg,
    { skip: !canUse || !effectiveOutletId },
  );

  const [cart, setCart] = useState<CartLine[]>([]);
  const [otherChargeStr, setOtherChargeStr] = useState("");
  const [cashPaidStr, setCashPaidStr] = useState("0");
  const [bankPaidStr, setBankPaidStr] = useState("0");
  const [notes, setNotes] = useState("");
  const [createSale, { isLoading: submitting }] = useCreateOutletSaleMutation();

  const stockRows = stockRes?.success ? stockRes.data ?? [] : [];

  const cartTotal = useMemo(() => {
    let t = 0;
    for (const l of cart) {
      const q = Number(l.qty);
      const p = Number(l.unitPrice);
      if (Number.isFinite(q) && Number.isFinite(p) && q > 0 && p >= 0)
        t += Math.round(q * p * 100) / 100;
    }
    return Math.round(t * 100) / 100;
  }, [cart]);

  const otherChargeResult = useMemo(() => {
    const t = otherChargeStr.trim();
    if (t === "") return { amount: 0, invalid: false };
    const n = Number(t);
    if (!Number.isFinite(n)) return { amount: 0, invalid: true };
    if (n < 0) return { amount: 0, invalid: true };
    return { amount: Math.round(n * 100) / 100, invalid: false };
  }, [otherChargeStr]);

  const grandTotalPreview =
    otherChargeResult.invalid
      ? cartTotal
      : Math.round((cartTotal + otherChargeResult.amount) * 100) / 100;

  useEffect(() => {
    setCashPaidStr(String(grandTotalPreview));
    setBankPaidStr("0");
  }, [grandTotalPreview]);

  const cashPaidResult = useMemo(
    () => parseMoneyInput(cashPaidStr),
    [cashPaidStr],
  );
  const bankPaidResult = useMemo(
    () => parseMoneyInput(bankPaidStr),
    [bankPaidStr],
  );

  const paymentSplitValid =
    !otherChargeResult.invalid &&
    !cashPaidResult.invalid &&
    !bankPaidResult.invalid &&
    Math.round((cashPaidResult.amount + bankPaidResult.amount) * 100) ===
      Math.round(grandTotalPreview * 100);

  const paymentRemainder = useMemo(() => {
    if (otherChargeResult.invalid) return null;
    if (cashPaidResult.invalid || bankPaidResult.invalid) return null;
    return (
      Math.round(
        (grandTotalPreview - cashPaidResult.amount - bankPaidResult.amount) *
          100,
      ) / 100
    );
  }, [
    otherChargeResult.invalid,
    cashPaidResult.invalid,
    cashPaidResult.amount,
    bankPaidResult.invalid,
    bankPaidResult.amount,
    grandTotalPreview,
  ]);

  const roundMoneyStr = (n: number) =>
    String(Math.round(Math.max(0, n) * 100) / 100);

  const setAllCashPayment = useCallback(() => {
    setCashPaidStr(roundMoneyStr(grandTotalPreview));
    setBankPaidStr("0");
  }, [grandTotalPreview]);

  const setAllBankPayment = useCallback(() => {
    setCashPaidStr("0");
    setBankPaidStr(roundMoneyStr(grandTotalPreview));
  }, [grandTotalPreview]);

  /** After editing cash, set bank so cash + bank = grand total. */
  const fillBankFromCash = useCallback(() => {
    if (otherChargeResult.invalid) return;
    const c = parseMoneyInput(cashPaidStr);
    const b = parseMoneyInput(bankPaidStr);
    if (!c.invalid && !b.invalid && c.amount >= 0 && b.amount >= 0) {
      const sumCents =
        Math.round(c.amount * 100) + Math.round(b.amount * 100);
      const grandCents = Math.round(grandTotalPreview * 100);
      if (sumCents === grandCents) return;
    }
    if (c.invalid || c.amount < 0) return;
    const bank = Math.round((grandTotalPreview - c.amount) * 100) / 100;
    setBankPaidStr(roundMoneyStr(bank));
  }, [cashPaidStr, bankPaidStr, grandTotalPreview, otherChargeResult.invalid]);

  /** After editing bank, set cash so cash + bank = grand total. */
  const fillCashFromBank = useCallback(() => {
    if (otherChargeResult.invalid) return;
    const c = parseMoneyInput(cashPaidStr);
    const b = parseMoneyInput(bankPaidStr);
    if (!c.invalid && !b.invalid && c.amount >= 0 && b.amount >= 0) {
      const sumCents =
        Math.round(c.amount * 100) + Math.round(b.amount * 100);
      const grandCents = Math.round(grandTotalPreview * 100);
      if (sumCents === grandCents) return;
    }
    if (b.invalid || b.amount < 0) return;
    const cash = Math.round((grandTotalPreview - b.amount) * 100) / 100;
    setCashPaidStr(roundMoneyStr(cash));
  }, [cashPaidStr, bankPaidStr, grandTotalPreview, otherChargeResult.invalid]);

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
              ? {
                  ...c,
                  qty: Math.min(c.maxQty, c.qty + 1),
                }
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
            unitPrice: row.sellPrice,
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
          unitPrice: row.sellPrice,
          qty: 1,
          maxQty: row.quantityOnHand,
        },
      ];
    });
  };

  const updateCartLine = (key: string, patch: Partial<{ qty: number; unitPrice: number }>) => {
    setCart((prev) =>
      prev.map((c) => (c.key === key ? { ...c, ...patch } as CartLine : c)),
    );
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const anyOverStock = cart.some((c) => c.qty > c.maxQty + 1e-9);

  const onCheckout = async () => {
    if (!effectiveOutletId) {
      toast.error("Select an outlet");
      return;
    }
    const menuLines = cart
      .filter((c): c is Extract<CartLine, { source: OutletStockSource.Warehouse }> => c.source === OutletStockSource.Warehouse)
      .map((c) => ({
        menuItemId: c.menuItemId,
        quantity: c.qty,
        unitPrice: c.unitPrice,
      }))
      .filter(
        (l) =>
          l.menuItemId &&
          Number.isFinite(l.quantity) &&
          Number.isFinite(l.unitPrice) &&
          l.quantity > 0 &&
          l.unitPrice >= 0,
      );
    const directLines = cart
      .filter((c): c is Extract<CartLine, { source: OutletStockSource.Direct }> => c.source === OutletStockSource.Direct)
      .map((c) => ({
        outletItemId: c.outletItemId,
        quantity: c.qty,
        unitPrice: c.unitPrice,
      }))
      .filter(
        (l) =>
          l.outletItemId &&
          Number.isFinite(l.quantity) &&
          Number.isFinite(l.unitPrice) &&
          l.quantity > 0 &&
          l.unitPrice >= 0,
      );
    if (menuLines.length === 0 && directLines.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (anyOverStock) {
      toast.error("Reduce quantities to on-hand or below before checkout");
      return;
    }
    if (otherChargeResult.invalid) {
      toast.error("Enter a valid other charge (zero or positive number).");
      return;
    }
    if (!paymentSplitValid) {
      toast.error("Cash plus bank must equal the grand total.");
      return;
    }
    try {
      const res = await createSale({
        notes: notes.trim() ? notes.trim() : null,
        otherChargeAmount: otherChargeResult.amount,
        cashPaidAmount: cashPaidResult.amount,
        bankPaidAmount: bankPaidResult.amount,
        menuLines,
        directLines,
        ...(isSuperAdmin ? { outletId: effectiveOutletId } : {}),
      }).unwrap();
      if (res.success && res.data) {
        toast.success(
          res.message
            ? `${res.message} Receipt ${res.data.receiptNo}.`
            : `Receipt ${res.data.receiptNo}`,
        );
        setCart([]);
        setOtherChargeStr("");
        setNotes("");
        void refetchStock();
        return;
      }
      toast.error(res.message ?? "Could not complete sale");
    } catch {
      toast.error("Request failed");
    }
  };

  if (!canUse) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Outlet POS</h2>
        <p className="text-sm text-muted-foreground">
          You do not have access to outlet sales.
        </p>
      </div>
    );
  }

  const selectClass = cn(
    "flex h-9 w-full max-w-xs rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  const salesRows = salesRes?.success ? salesRes.data ?? [] : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Outlet POS</h2>
        <p className="text-sm text-muted-foreground">
          Sell menu stock (from warehouse transfers) and direct retail items.
          Quantities cannot exceed on-hand; the server re-checks on submit. One
          sale can combine cash and bank in a single payment—split the amounts
          below to match what the customer paid.
        </p>
      </div>

      {isSuperAdmin && (
        <div className="space-y-2">
          <Label>Outlet for this session</Label>
          <select
            className={selectClass}
            value={posOutletId}
            onChange={(e) => {
              setPosOutletId(e.target.value);
              setCart([]);
              setOtherChargeStr("");
            }}
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

      {!effectiveOutletId ? (
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin
            ? "Choose an outlet to load sellable stock."
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
                      <TableHead className="text-right">Price</TableHead>
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
                        <TableCell className="text-right tabular-nums">
                          {formatAmount(r.sellPrice)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
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
            <h3 className="text-sm font-semibold text-foreground">Cart & checkout</h3>
            <div className="space-y-3 rounded-lg border border-border bg-white p-4 shadow-sm">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add lines from the stock list.
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.map((line) => {
                    const over = line.qty > line.maxQty;
                    return (
                      <div
                        key={line.key}
                        className="grid gap-2 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-2"
                      >
                        <div>
                          <p className="font-medium">{line.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Max {line.maxQty}{" "}
                            {line.source === OutletStockSource.Warehouse
                              ? "(menu)"
                              : "(direct)"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-end gap-2 sm:justify-end">
                          <div className="space-y-1">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              className="w-24"
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.qty}
                              onChange={(e) =>
                                updateCartLine(line.key, {
                                  qty: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unit price</Label>
                            <Input
                              className="w-28"
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) =>
                                updateCartLine(line.key, {
                                  unitPrice: Number(e.target.value),
                                })
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLine(line.key)}
                          >
                            Remove
                          </Button>
                        </div>
                        {over ? (
                          <p className="text-xs text-destructive sm:col-span-2">
                            Quantity exceeds on-hand ({line.maxQty}).
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 border-t border-border pt-3">
                <Label htmlFor="pos-other-charge">Other charge (optional)</Label>
                <p className="text-xs text-muted-foreground">
                  One amount for delivery, service fee, etc. Added to the sale total.
                </p>
                <Input
                  id="pos-other-charge"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={otherChargeStr}
                  onChange={(e) => setOtherChargeStr(e.target.value)}
                />
                {otherChargeResult.invalid ? (
                  <p className="text-xs text-destructive">
                    Enter a valid number (zero or positive).
                  </p>
                ) : null}
              </div>

              <div className="space-y-1 border-t border-border pt-3 text-sm tabular-nums">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Lines subtotal</span>
                  <span>{formatAmount(cartTotal)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Other charge</span>
                  <span>
                    {otherChargeResult.invalid
                      ? "—"
                      : formatAmount(otherChargeResult.amount)}
                  </span>
                </div>
                <div className="flex justify-between gap-2 font-semibold">
                  <span>Grand total</span>
                  <span>{formatAmount(grandTotalPreview)}</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <Label>Payment — cash and bank (same sale)</Label>
                <p className="text-xs text-muted-foreground">
                  Record how much the customer paid in cash vs bank/transfer in
                  one go. When the cart total changes, payment defaults to all
                  cash—adjust as needed. Leaving a field and tabbing out fills
                  the other side to match the grand total.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setAllCashPayment}
                    disabled={otherChargeResult.invalid}
                  >
                    All cash
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setAllBankPayment}
                    disabled={otherChargeResult.invalid}
                  >
                    All bank
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fillBankFromCash}
                    disabled={otherChargeResult.invalid}
                  >
                    Fill bank from cash
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fillCashFromBank}
                    disabled={otherChargeResult.invalid}
                  >
                    Fill cash from bank
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="pos-cash" className="text-xs">
                      Cash received
                    </Label>
                    <Input
                      id="pos-cash"
                      type="number"
                      min={0}
                      step="0.01"
                      value={cashPaidStr}
                      onChange={(e) => setCashPaidStr(e.target.value)}
                      onBlur={fillBankFromCash}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="pos-bank" className="text-xs">
                      Bank / transfer received
                    </Label>
                    <Input
                      id="pos-bank"
                      type="number"
                      min={0}
                      step="0.01"
                      value={bankPaidStr}
                      onChange={(e) => setBankPaidStr(e.target.value)}
                      onBlur={fillCashFromBank}
                    />
                  </div>
                </div>
                {paymentRemainder !== null ? (
                  <div
                    className={cn(
                      "flex justify-between gap-2 rounded-md border px-2 py-1.5 text-sm tabular-nums",
                      Math.abs(paymentRemainder) < 0.005
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "border-amber-200 bg-amber-50 text-amber-950",
                    )}
                  >
                    <span className="font-medium">Remaining to match total</span>
                    <span>
                      {paymentRemainder > 0 ? "+" : ""}
                      {formatAmount(paymentRemainder)}
                    </span>
                  </div>
                ) : null}
                {cashPaidResult.invalid || bankPaidResult.invalid ? (
                  <p className="text-xs text-destructive">
                    Enter valid cash and bank amounts (zero or positive).
                  </p>
                ) : !paymentSplitValid && !otherChargeResult.invalid ? (
                  <p className="text-xs text-destructive">
                    Cash plus bank (
                    {formatAmount(cashPaidResult.amount + bankPaidResult.amount)}
                    ) must equal {formatAmount(grandTotalPreview)}. Use the
                    buttons above or tab out of a field to auto-balance.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <Label htmlFor="pos-notes">Notes (optional)</Label>
                <Input
                  id="pos-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={2000}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button
                  type="button"
                  disabled={
                    submitting ||
                    anyOverStock ||
                    cart.length === 0 ||
                    otherChargeResult.invalid ||
                    !paymentSplitValid
                  }
                  onClick={() => void onCheckout()}
                >
                  {submitting ? "Posting…" : "Complete sale"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {effectiveOutletId ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Recent sales</h3>
          {salesLoading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {!salesLoading && (
            <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt</TableHead>
                    <TableHead>When</TableHead>
                    {isSuperAdmin ? <TableHead>Outlet</TableHead> : null}
                    <TableHead className="text-right">Other ch.</TableHead>
                    <TableHead className="text-right">Cash</TableHead>
                    <TableHead className="text-right">Bank</TableHead>
                    <TableHead className="text-right">Grand total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isSuperAdmin ? 7 : 6}
                        className="text-muted-foreground"
                      >
                        No sales yet for this outlet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesRows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">
                          {s.receiptNo}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDateTime(s.saleAtUtc)}
                        </TableCell>
                        {isSuperAdmin ? (
                          <TableCell className="text-sm">{s.outletName}</TableCell>
                        ) : null}
                        <TableCell className="text-right tabular-nums">
                          {formatAmount(s.otherChargeAmount ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatAmount(s.cashPaidAmount ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatAmount(s.bankPaidAmount ?? 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatAmount(s.grandTotal)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
