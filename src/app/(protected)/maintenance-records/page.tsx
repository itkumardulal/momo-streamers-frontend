"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { RowEditDeleteActions } from "@/components/row-edit-delete-actions";
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
import type { AssetMaintenance } from "@/entities/types";
import {
  useCreateAssetMaintenanceMutation,
  useDeleteAssetMaintenanceMutation,
  useGetAssetMaintenancesQuery,
  useGetAssetsQuery,
  useGetExpenseItemsQuery,
  useGetOutletsQuery,
  useGetWarehousesQuery,
  useUpdateAssetMaintenanceMutation,
} from "@/features/api/apiSlice";
import { cn } from "@/lib/utils";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

const maintFormSchema = z
  .object({
    assetId: z.string().min(1, "Asset is required"),
    maintenanceDate: z.string().min(1, "Maintenance date is required"),
    cost: z.string().min(1, "Cost is required"),
    recordAsExpense: z.boolean(),
    expenseItemId: z.string().optional(),
    locationKind: z.enum(["outlet", "warehouse"]).optional(),
    outletId: z.string().optional(),
    warehouseId: z.string().optional(),
    description: z.string().max(2000).optional(),
    remarks: z.string().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    const cost = Number(v.cost);
    if (Number.isNaN(cost) || cost < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid cost",
        path: ["cost"],
      });
    }
    if (v.recordAsExpense) {
      if (!(cost > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a cost above zero to record as an expense",
          path: ["cost"],
        });
      }
      if (!v.expenseItemId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Expense item is required",
          path: ["expenseItemId"],
        });
      }
      if (v.locationKind === "outlet" && !v.outletId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select an outlet",
          path: ["outletId"],
        });
      } else if (v.locationKind === "warehouse" && !v.warehouseId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select a warehouse",
          path: ["warehouseId"],
        });
      } else if (!v.locationKind) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select an outlet or warehouse",
          path: ["locationKind"],
        });
      }
    }
  });

type MaintForm = z.infer<typeof maintFormSchema>;

const textAreaClass = cn(
  "flex min-h-[72px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

const selectClass = cn(
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function emptyForm(today: string): MaintForm {
  return {
    assetId: "",
    maintenanceDate: today,
    cost: "",
    recordAsExpense: false,
    expenseItemId: "",
    locationKind: "outlet",
    outletId: "",
    warehouseId: "",
    description: "",
    remarks: "",
  };
}

function fromRow(m: AssetMaintenance): MaintForm {
  return {
    assetId: m.assetId,
    maintenanceDate: m.maintenanceDate.slice(0, 10),
    cost: String(m.cost),
    recordAsExpense: m.recordAsExpense,
    expenseItemId: m.expenseItemId ?? "",
    locationKind: m.warehouseId ? "warehouse" : "outlet",
    outletId: m.outletId ?? "",
    warehouseId: m.warehouseId ?? "",
    description: m.description ?? "",
    remarks: m.remarks ?? "",
  };
}

function toBody(values: MaintForm) {
  const cost = Number(values.cost);
  return {
    assetId: values.assetId,
    maintenanceDate: values.maintenanceDate,
    cost,
    recordAsExpense: values.recordAsExpense,
    expenseItemId: values.recordAsExpense
      ? values.expenseItemId || null
      : null,
    outletId:
      values.recordAsExpense && values.locationKind === "outlet"
        ? values.outletId || null
        : null,
    warehouseId:
      values.recordAsExpense && values.locationKind === "warehouse"
        ? values.warehouseId || null
        : null,
    description: values.description?.trim() || null,
    remarks: values.remarks?.trim() || null,
  };
}

export default function MaintenanceRecordsPage() {
  const today = useMemo(() => ymd(new Date()), []);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [appliedFrom, setAppliedFrom] = useState(today);
  const [appliedTo, setAppliedTo] = useState(today);
  const [assetFilter, setAssetFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: assetsRes } = useGetAssetsQuery();
  const { data: expenseItemsRes } = useGetExpenseItemsQuery();
  const { data: outletsRes } = useGetOutletsQuery();
  const { data: warehousesRes } = useGetWarehousesQuery();
  const { data, isLoading, isError, refetch } = useGetAssetMaintenancesQuery({
    fromDate: appliedFrom,
    toDate: appliedTo,
    ...(assetFilter ? { assetId: assetFilter } : {}),
  });

  const [createMaint, { isLoading: creating }] =
    useCreateAssetMaintenanceMutation();
  const [updateMaint, { isLoading: updating }] =
    useUpdateAssetMaintenanceMutation();
  const [deleteMaint, { isLoading: deleting }] =
    useDeleteAssetMaintenanceMutation();

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AssetMaintenance | null>(null);

  const form = useForm<MaintForm>({
    resolver: zodResolver(maintFormSchema),
    defaultValues: emptyForm(today),
  });
  const editForm = useForm<MaintForm>({
    resolver: zodResolver(maintFormSchema),
    defaultValues: emptyForm(today),
  });

  useEffect(() => {
    if (!editing || !editOpen) return;
    editForm.reset(fromRow(editing));
  }, [editing, editOpen, editForm]);

  const assets = assetsRes?.success ? assetsRes.data ?? [] : [];
  const expenseItems = expenseItemsRes?.success
    ? expenseItemsRes.data ?? []
    : [];
  const outlets = outletsRes?.success ? outletsRes.data ?? [] : [];
  const warehouses = warehousesRes?.success ? warehousesRes.data ?? [] : [];
  const rows = data?.success ? data.data ?? [] : [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.assetName.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.remarks ?? "").toLowerCase().includes(q) ||
        (r.expenseItemName ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const recordExpense = form.watch("recordAsExpense");
  const locationKind = form.watch("locationKind");
  const editRecordExpense = editForm.watch("recordAsExpense");
  const editLocationKind = editForm.watch("locationKind");

  const onCreate = form.handleSubmit(async (values) => {
    try {
      const res = await createMaint(toBody(values)).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Maintenance saved");
        setOpen(false);
        form.reset(emptyForm(today));
        return;
      }
      toast.error(res.message ?? "Could not save maintenance");
    } catch {
      toast.error("Request failed");
    }
  });

  const onEditSave = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      const res = await updateMaint({
        id: editing.id,
        body: toBody(values),
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Maintenance updated");
        setEditOpen(false);
        setEditing(null);
        return;
      }
      toast.error(res.message ?? "Could not update maintenance");
    } catch {
      toast.error("Request failed");
    }
  });

  const onDelete = async (row: AssetMaintenance) => {
    if (!confirm(`Remove maintenance for "${row.assetName}"?`)) return;
    try {
      const res = await deleteMaint(row.id).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Maintenance removed");
        return;
      }
      toast.error(res.message ?? "Could not remove maintenance");
    } catch {
      toast.error("Request failed");
    }
  };

  function renderFields(
    f: typeof form | typeof editForm,
    prefix: string,
    asExpense: boolean,
    locKind: string | undefined,
  ) {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-asset`}>
            Asset <span className="text-destructive">*</span>
          </Label>
          <select
            id={`${prefix}-asset`}
            className={selectClass}
            {...f.register("assetId")}
          >
            <option value="">Select asset</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {f.formState.errors.assetId && (
            <p className="text-xs text-destructive">
              {f.formState.errors.assetId.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-date`}>
            Maintenance date <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${prefix}-date`}
            type="date"
            {...f.register("maintenanceDate")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-cost`}>
            Cost <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${prefix}-cost`}
            inputMode="decimal"
            {...f.register("cost")}
          />
          {f.formState.errors.cost && (
            <p className="text-xs text-destructive">
              {f.formState.errors.cost.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Expense</Label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              {...f.register("recordAsExpense")}
            />
            <span>
              <span className="font-medium">Record as expense</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Enter a cost above zero to record as an expense.
              </span>
            </span>
          </label>
        </div>
        {asExpense && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-ei`}>
                Expense item <span className="text-destructive">*</span>
              </Label>
              <select
                id={`${prefix}-ei`}
                className={selectClass}
                {...f.register("expenseItemId")}
              >
                <option value="">Select expense item</option>
                {expenseItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              {f.formState.errors.expenseItemId && (
                <p className="text-xs text-destructive">
                  {f.formState.errors.expenseItemId.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-loc`}>
                Charge to <span className="text-destructive">*</span>
              </Label>
              <select
                id={`${prefix}-loc`}
                className={selectClass}
                {...f.register("locationKind")}
              >
                <option value="outlet">Outlet</option>
                <option value="warehouse">Warehouse</option>
              </select>
              {f.formState.errors.locationKind && (
                <p className="text-xs text-destructive">
                  {f.formState.errors.locationKind.message}
                </p>
              )}
            </div>
            {locKind === "outlet" && (
              <div className="space-y-2">
                <Label htmlFor={`${prefix}-outlet`}>Outlet</Label>
                <select
                  id={`${prefix}-outlet`}
                  className={selectClass}
                  {...f.register("outletId")}
                >
                  <option value="">Select outlet</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                {f.formState.errors.outletId && (
                  <p className="text-xs text-destructive">
                    {f.formState.errors.outletId.message}
                  </p>
                )}
              </div>
            )}
            {locKind === "warehouse" && (
              <div className="space-y-2">
                <Label htmlFor={`${prefix}-wh`}>Warehouse</Label>
                <select
                  id={`${prefix}-wh`}
                  className={selectClass}
                  {...f.register("warehouseId")}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {f.formState.errors.warehouseId && (
                  <p className="text-xs text-destructive">
                    {f.formState.errors.warehouseId.message}
                  </p>
                )}
              </div>
            )}
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-desc`}>Description</Label>
          <textarea
            id={`${prefix}-desc`}
            className={textAreaClass}
            {...f.register("description")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-remarks`}>Remarks</Label>
          <Input id={`${prefix}-remarks`} {...f.register("remarks")} />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Maintenance records
          </h2>
          <p className="text-sm text-muted-foreground">
            Track repairs and servicing costs for your assets.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v) form.reset(emptyForm(today));
          }}
        >
          <DialogTrigger
            render={<Button type="button">Add maintenance</Button>}
          />
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add maintenance</DialogTitle>
              <DialogDescription>
                Optionally post the cost to daily expenses.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              {renderFields(form, "m", recordExpense, locationKind)}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="mf-from">From</Label>
          <Input
            id="mf-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mf-to">To</Label>
          <Input
            id="mf-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAppliedFrom(fromDate);
            setAppliedTo(toDate);
          }}
        >
          Apply filter
        </Button>
        <select
          className={cn(selectClass, "w-full sm:w-56")}
          value={assetFilter}
          onChange={(e) => setAssetFilter(e.target.value)}
        >
          <option value="">All assets</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit maintenance</DialogTitle>
            <DialogDescription>
              {editing ? editing.assetName : null}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-4">
              {renderFields(
                editForm,
                "em",
                editRecordExpense,
                editLocationKind,
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-border bg-white shadow-sm">
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        )}
        {isError && (
          <div className="space-y-2 p-6">
            <p className="text-sm text-destructive">
              Failed to load maintenance records.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !isError && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Expense</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="min-w-[148px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No maintenance records in this range.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDay(r.maintenanceDate)}</TableCell>
                    <TableCell className="font-medium">{r.assetName}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(r.cost)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.recordAsExpense
                        ? r.expenseItemName ||
                          r.outletName ||
                          r.warehouseName ||
                          "Yes"
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {r.description || "—"}
                    </TableCell>
                    <TableCell className="min-w-[148px] whitespace-normal text-right align-middle">
                      <RowEditDeleteActions
                        busy={deleting}
                        onEdit={() => {
                          setEditing(r);
                          setEditOpen(true);
                        }}
                        onDelete={() => onDelete(r)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
