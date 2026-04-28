"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import type { ExpenseEntry } from "@/entities/types";
import {
  useCreateExpenseEntryMutation,
  useDeleteExpenseEntryMutation,
  useGetExpenseEntriesQuery,
  useGetExpenseItemsQuery,
  useGetOutletsQuery,
  useGetWarehousesQuery,
  useUpdateExpenseEntryMutation,
} from "@/features/api/apiSlice";
import { selectCanManageDailyExpenses } from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d)
    return null;
  return dt;
}

function addDaysYmd(iso: string, delta: number): string {
  const p = parseYmd(iso);
  if (!p) return iso;
  p.setDate(p.getDate() + delta);
  return ymd(p);
}

function formatMoney(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDayLabel(isoDate: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  try {
    const [y, m, d] = isoDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export default function ExpenseEntriesPage() {
  const canView = useAppSelector(selectCanManageDailyExpenses);
  const today = useMemo(() => ymd(new Date()), []);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [addItemId, setAddItemId] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addExpenseDate, setAddExpenseDate] = useState(today);
  const [addNotes, setAddNotes] = useState("");
  const [addLocationMode, setAddLocationMode] = useState<"outlet" | "warehouse">("outlet");
  const [addOutletId, setAddOutletId] = useState("");
  const [addWarehouseId, setAddWarehouseId] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);
  const [editItemId, setEditItemId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLocationMode, setEditLocationMode] = useState<"outlet" | "warehouse">("outlet");
  const [editOutletId, setEditOutletId] = useState("");
  const [editWarehouseId, setEditWarehouseId] = useState("");

  const { data: itemsRes } = useGetExpenseItemsQuery(undefined, {
    skip: !canView,
  });
  const expenseItems = itemsRes?.success ? itemsRes.data ?? [] : [];

  const { data: outletsRes } = useGetOutletsQuery(undefined, { skip: !canView });
  const { data: warehousesRes } = useGetWarehousesQuery(undefined, { skip: !canView });
  const outlets = useMemo(() => {
    const list = outletsRes?.success ? outletsRes.data ?? [] : [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [outletsRes]);
  const warehouses = useMemo(() => {
    const list = warehousesRes?.success ? warehousesRes.data ?? [] : [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [warehousesRes]);

  const listArg = useMemo(
    () => ({ fromDate, toDate }),
    [fromDate, toDate],
  );
  const { data: listRes, isLoading, isError, refetch } = useGetExpenseEntriesQuery(
    listArg,
    { skip: !canView },
  );
  const entries = useMemo(
    () => (listRes?.success ? listRes.data ?? [] : []),
    [listRes],
  );

  const [createEntry, { isLoading: creating }] = useCreateExpenseEntryMutation();
  const [updateEntry, { isLoading: updating }] = useUpdateExpenseEntryMutation();
  const [deleteEntry, { isLoading: deleting }] = useDeleteExpenseEntryMutation();

  const selectClass = cn(
    "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  const textAreaClass = cn(
    "flex min-h-[72px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none",
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  );

  const rangeTotal = useMemo(
    () => entries.reduce((s, e) => s + (Number.isFinite(e.amount) ? e.amount : 0), 0),
    [entries],
  );

  const onAdd = async () => {
    if (!addItemId) {
      toast.error("Choose an expense category");
      return;
    }
    if (addLocationMode === "outlet" && !addOutletId) {
      toast.error("Select an outlet");
      return;
    }
    if (addLocationMode === "warehouse" && !addWarehouseId) {
      toast.error("Select a warehouse");
      return;
    }
    const amount = Number(addAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount greater than zero");
      return;
    }
    try {
      const res = await createEntry({
        expenseItemId: addItemId,
        amount,
        expenseDate: addExpenseDate,
        outletId: addLocationMode === "outlet" ? addOutletId : null,
        warehouseId: addLocationMode === "warehouse" ? addWarehouseId : null,
        notes: addNotes.trim() ? addNotes.trim() : null,
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Expense saved");
        setAddAmount("");
        setAddNotes("");
        return;
      }
      toast.error(res.message ?? "Could not save expense");
    } catch {
      toast.error("Request failed");
    }
  };

  const openEdit = (row: ExpenseEntry) => {
    setEditing(row);
    setEditItemId(row.expenseItemId);
    setEditAmount(String(row.amount));
    setEditExpenseDate(row.expenseDate.slice(0, 10));
    setEditNotes(row.notes ?? "");
    if (row.warehouseId) {
      setEditLocationMode("warehouse");
      setEditWarehouseId(row.warehouseId);
      setEditOutletId("");
    } else {
      setEditLocationMode("outlet");
      setEditOutletId(row.outletId ?? "");
      setEditWarehouseId("");
    }
    setEditOpen(true);
  };

  const onEditSave = async () => {
    if (!editing) return;
    if (!editItemId) {
      toast.error("Choose an expense category");
      return;
    }
    if (editLocationMode === "outlet" && !editOutletId) {
      toast.error("Select an outlet");
      return;
    }
    if (editLocationMode === "warehouse" && !editWarehouseId) {
      toast.error("Select a warehouse");
      return;
    }
    const amount = Number(editAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount greater than zero");
      return;
    }
    try {
      const res = await updateEntry({
        id: editing.id,
        body: {
          expenseItemId: editItemId,
          amount,
          expenseDate: editExpenseDate,
          outletId: editLocationMode === "outlet" ? editOutletId : null,
          warehouseId: editLocationMode === "warehouse" ? editWarehouseId : null,
          notes: editNotes.trim() ? editNotes.trim() : null,
        },
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Expense updated");
        setEditOpen(false);
        setEditing(null);
        return;
      }
      toast.error(res.message ?? "Could not update expense");
    } catch {
      toast.error("Request failed");
    }
  };

  const onDelete = async (row: ExpenseEntry) => {
    if (!confirm(`Remove this ${row.expenseItemName} entry (${formatMoney(row.amount)})?`))
      return;
    try {
      const res = await deleteEntry(row.id).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Removed");
        return;
      }
      toast.error(res.message ?? "Could not remove");
    } catch {
      toast.error("Request failed");
    }
  };

  if (!canView) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Daily expenses</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Only a super admin can record daily expenses. Sign in with a super admin
          account to use this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Daily expenses</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Log amounts against your{" "}
          <Link href="/expense-items" className="font-medium text-primary underline-offset-2 hover:underline">
            expense categories
          </Link>
          . Pick the date range to review; totals update automatically.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Date range</CardTitle>
          <CardDescription>
            From / To use the business calendar day stored with each entry.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-wrap gap-4 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="ex-from">From</Label>
            <Input
              id="ex-from"
              type="date"
              value={fromDate}
              onChange={(e) => {
                const v = e.target.value;
                setFromDate(v);
                if (toDate < v) setToDate(v);
              }}
              className="w-[11rem]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ex-to">To</Label>
            <Input
              id="ex-to"
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[11rem]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFromDate(addDaysYmd(fromDate, -1));
                setToDate(addDaysYmd(toDate, -1));
                setAddExpenseDate(addDaysYmd(addExpenseDate, -1));
              }}
            >
              Shift −1 day
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFromDate(today);
                setToDate(today);
                setAddExpenseDate(today);
              }}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFromDate(addDaysYmd(fromDate, 1));
                setToDate(addDaysYmd(toDate, 1));
                setAddExpenseDate(addDaysYmd(addExpenseDate, 1));
              }}
            >
              Shift +1 day
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add expense</CardTitle>
            <CardDescription>
              Quick entry for one line. Date defaults to today; change it if you are
              catching up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {expenseItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No categories yet.{" "}
                <Link href="/expense-items" className="font-medium text-primary underline-offset-2 hover:underline">
                  Create expense items
                </Link>{" "}
                first.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ex-cat">Category</Label>
                  <select
                    id="ex-cat"
                    className={selectClass}
                    value={addItemId}
                    onChange={(e) => setAddItemId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {expenseItems.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Charge to</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={addLocationMode === "outlet" ? "default" : "outline"}
                      onClick={() => {
                        setAddLocationMode("outlet");
                        setAddWarehouseId("");
                      }}
                    >
                      Outlet
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={addLocationMode === "warehouse" ? "default" : "outline"}
                      onClick={() => {
                        setAddLocationMode("warehouse");
                        setAddOutletId("");
                      }}
                    >
                      Warehouse
                    </Button>
                  </div>
                  {addLocationMode === "outlet" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="ex-outlet">Outlet</Label>
                      <select
                        id="ex-outlet"
                        className={selectClass}
                        value={addOutletId}
                        onChange={(e) => setAddOutletId(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {outlets.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                            {o.warehouseName ? ` (${o.warehouseName})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="ex-wh">Warehouse</Label>
                      <select
                        id="ex-wh"
                        className={selectClass}
                        value={addWarehouseId}
                        onChange={(e) => setAddWarehouseId(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {warehouses.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ex-amt">Amount</Label>
                  <Input
                    id="ex-amt"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ex-date">Expense date</Label>
                  <Input
                    id="ex-date"
                    type="date"
                    value={addExpenseDate}
                    onChange={(e) => setAddExpenseDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ex-notes">Notes (optional)</Label>
                  <textarea
                    id="ex-notes"
                    className={textAreaClass}
                    rows={2}
                    placeholder="e.g. invoice #, vendor"
                    value={addNotes}
                    onChange={(e) => setAddNotes(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={onAdd} disabled={creating} className="w-full">
                  {creating ? "Saving…" : "Add expense"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base">Entries</CardTitle>
              <CardDescription>
                {fromDate === toDate
                  ? formatDayLabel(fromDate)
                  : `${formatDayLabel(fromDate)} → ${formatDayLabel(toDate)}`}
              </CardDescription>
            </div>
            <div className="rounded-md bg-slate-100 px-3 py-2 text-right dark:bg-slate-800">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total in range
              </p>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {formatMoney(rangeTotal)}
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {isLoading && (
              <p className="px-6 py-8 text-sm text-muted-foreground">Loading…</p>
            )}
            {isError && (
              <div className="space-y-2 px-6 py-6">
                <p className="text-sm text-destructive">Could not load entries.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            )}
            {!isLoading && !isError && entries.length === 0 && (
              <p className="px-6 py-8 text-sm text-muted-foreground">
                No expenses in this range. Add one using the form on the left, or widen
                the date range above.
              </p>
            )}
            {!isLoading && !isError && entries.length > 0 && (
              <div className="overflow-x-auto border-t border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[1%] whitespace-nowrap text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDayLabel(row.expenseDate.slice(0, 10))}
                        </TableCell>
                        <TableCell className="font-medium">{row.expenseItemName}</TableCell>
                        <TableCell className="max-w-[10rem] text-sm text-muted-foreground">
                          {row.outletName
                            ? `Outlet: ${row.outletName}`
                            : row.warehouseName
                              ? `Warehouse: ${row.warehouseName}`
                              : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(row.amount)}
                        </TableCell>
                        <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                          {row.notes ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => openEdit(row)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-destructive hover:text-destructive"
                              disabled={deleting}
                              onClick={() => onDelete(row)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
            <DialogDescription>
              Update category, outlet or warehouse, date, amount, or notes.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ex-edit-cat">Category</Label>
                <select
                  id="ex-edit-cat"
                  className={selectClass}
                  value={editItemId}
                  onChange={(e) => setEditItemId(e.target.value)}
                >
                  {expenseItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Charge to</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={editLocationMode === "outlet" ? "default" : "outline"}
                    onClick={() => {
                      setEditLocationMode("outlet");
                      setEditWarehouseId("");
                    }}
                  >
                    Outlet
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={editLocationMode === "warehouse" ? "default" : "outline"}
                    onClick={() => {
                      setEditLocationMode("warehouse");
                      setEditOutletId("");
                    }}
                  >
                    Warehouse
                  </Button>
                </div>
                {editLocationMode === "outlet" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="ex-edit-outlet">Outlet</Label>
                    <select
                      id="ex-edit-outlet"
                      className={selectClass}
                      value={editOutletId}
                      onChange={(e) => setEditOutletId(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                          {o.warehouseName ? ` (${o.warehouseName})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="ex-edit-wh">Warehouse</Label>
                    <select
                      id="ex-edit-wh"
                      className={selectClass}
                      value={editWarehouseId}
                      onChange={(e) => setEditWarehouseId(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-edit-amt">Amount</Label>
                <Input
                  id="ex-edit-amt"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-edit-date">Expense date</Label>
                <Input
                  id="ex-edit-date"
                  type="date"
                  value={editExpenseDate}
                  onChange={(e) => setEditExpenseDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-edit-notes">Notes (optional)</Label>
                <textarea
                  id="ex-edit-notes"
                  className={textAreaClass}
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button type="button" onClick={onEditSave} disabled={updating}>
                  {updating ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
