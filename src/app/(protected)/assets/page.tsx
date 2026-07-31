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
import type { Asset } from "@/entities/types";
import {
  ASSET_STATUS_OPTIONS,
  AssetStatus,
} from "@/entities/types";
import {
  useCreateAssetMutation,
  useDeleteAssetMutation,
  useGetAssetCategoriesQuery,
  useGetAssetsQuery,
  useGetOutletsQuery,
  useGetWarehousesQuery,
  useUpdateAssetMutation,
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

const assetFormSchema = z
  .object({
    categoryId: z.string().min(1, "Category is required"),
    name: z.string().min(1, "Asset name is required").max(200),
    purchaseDate: z.string().min(1, "Purchase date is required"),
    purchaseCost: z.string().min(1, "Purchase cost is required"),
    warrantyExpiry: z.string().optional(),
    status: z.nativeEnum(AssetStatus),
    remarks: z.string().max(2000).optional(),
    locationKind: z.enum(["none", "outlet", "warehouse"]),
    outletId: z.string().optional(),
    warehouseId: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    const cost = Number(v.purchaseCost);
    if (Number.isNaN(cost) || cost < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid purchase cost",
        path: ["purchaseCost"],
      });
    }
    if (v.locationKind === "outlet" && !v.outletId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select an outlet",
        path: ["outletId"],
      });
    }
    if (v.locationKind === "warehouse" && !v.warehouseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a warehouse",
        path: ["warehouseId"],
      });
    }
  });

type AssetForm = z.infer<typeof assetFormSchema>;

const textAreaClass = cn(
  "flex min-h-[72px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

const selectClass = cn(
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function statusLabel(s: AssetStatus) {
  return ASSET_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? String(s);
}

function toBody(values: AssetForm) {
  const cost = Number(values.purchaseCost);
  return {
    categoryId: values.categoryId,
    name: values.name.trim(),
    purchaseDate: values.purchaseDate,
    purchaseCost: cost,
    warrantyExpiry: values.warrantyExpiry?.trim() || null,
    status: values.status,
    remarks: values.remarks?.trim() || null,
    outletId:
      values.locationKind === "outlet" ? values.outletId || null : null,
    warehouseId:
      values.locationKind === "warehouse" ? values.warehouseId || null : null,
  };
}

function emptyForm(today: string): AssetForm {
  return {
    categoryId: "",
    name: "",
    purchaseDate: today,
    purchaseCost: "",
    warrantyExpiry: "",
    status: AssetStatus.Active,
    remarks: "",
    locationKind: "none",
    outletId: "",
    warehouseId: "",
  };
}

function fromAsset(a: Asset): AssetForm {
  return {
    categoryId: a.categoryId,
    name: a.name,
    purchaseDate: a.purchaseDate.slice(0, 10),
    purchaseCost: String(a.purchaseCost),
    warrantyExpiry: a.warrantyExpiry?.slice(0, 10) ?? "",
    status: a.status,
    remarks: a.remarks ?? "",
    locationKind: a.outletId
      ? "outlet"
      : a.warehouseId
        ? "warehouse"
        : "none",
    outletId: a.outletId ?? "",
    warehouseId: a.warehouseId ?? "",
  };
}

export default function AssetsPage() {
  const today = useMemo(() => ymd(new Date()), []);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const { data: catRes } = useGetAssetCategoriesQuery();
  const { data, isLoading, isError, refetch } = useGetAssetsQuery(
    categoryFilter ? { categoryId: categoryFilter } : undefined,
  );
  const { data: outletsRes } = useGetOutletsQuery();
  const { data: warehousesRes } = useGetWarehousesQuery();
  const [createAsset, { isLoading: creating }] = useCreateAssetMutation();
  const [updateAsset, { isLoading: updating }] = useUpdateAssetMutation();
  const [deleteAsset, { isLoading: deleting }] = useDeleteAssetMutation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);

  const form = useForm<AssetForm>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: emptyForm(today),
  });
  const editForm = useForm<AssetForm>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: emptyForm(today),
  });

  useEffect(() => {
    if (!editing || !editOpen) return;
    editForm.reset(fromAsset(editing));
  }, [editing, editOpen, editForm]);

  const categories = catRes?.success ? catRes.data ?? [] : [];
  const outlets = outletsRes?.success ? outletsRes.data ?? [] : [];
  const warehouses = warehousesRes?.success ? warehousesRes.data ?? [] : [];
  const assets = data?.success ? data.data ?? [] : [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.categoryName.toLowerCase().includes(q) ||
        (a.remarks ?? "").toLowerCase().includes(q),
    );
  }, [assets, search]);

  const locationKind = form.watch("locationKind");
  const editLocationKind = editForm.watch("locationKind");

  const onCreate = form.handleSubmit(async (values) => {
    try {
      const res = await createAsset(toBody(values)).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Asset created");
        setOpen(false);
        form.reset(emptyForm(today));
        return;
      }
      toast.error(res.message ?? "Could not create asset");
    } catch {
      toast.error("Request failed");
    }
  });

  const onEditSave = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      const res = await updateAsset({
        id: editing.id,
        body: toBody(values),
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Asset updated");
        setEditOpen(false);
        setEditing(null);
        return;
      }
      toast.error(res.message ?? "Could not update asset");
    } catch {
      toast.error("Request failed");
    }
  });

  const onDelete = async (a: Asset) => {
    if (!confirm(`Remove asset "${a.name}"?`)) return;
    try {
      const res = await deleteAsset(a.id).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Asset removed");
        return;
      }
      toast.error(res.message ?? "Could not remove asset");
    } catch {
      toast.error("Request failed");
    }
  };

  function renderFields(
    f: typeof form | typeof editForm,
    prefix: string,
    kind: string,
  ) {
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-name`}>
            Asset name <span className="text-destructive">*</span>
          </Label>
          <Input id={`${prefix}-name`} {...f.register("name")} />
          {f.formState.errors.name && (
            <p className="text-xs text-destructive">
              {f.formState.errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-cat`}>
            Category <span className="text-destructive">*</span>
          </Label>
          <select
            id={`${prefix}-cat`}
            className={selectClass}
            {...f.register("categoryId")}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {f.formState.errors.categoryId && (
            <p className="text-xs text-destructive">
              {f.formState.errors.categoryId.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-pdate`}>
            Purchase date <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${prefix}-pdate`}
            type="date"
            {...f.register("purchaseDate")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-cost`}>
            Purchase cost <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${prefix}-cost`}
            inputMode="decimal"
            {...f.register("purchaseCost")}
          />
          {f.formState.errors.purchaseCost && (
            <p className="text-xs text-destructive">
              {f.formState.errors.purchaseCost.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-warranty`}>Warranty expiry</Label>
          <Input
            id={`${prefix}-warranty`}
            type="date"
            {...f.register("warrantyExpiry")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-status`}>Status</Label>
          <select
            id={`${prefix}-status`}
            className={selectClass}
            {...f.register("status", { valueAsNumber: true })}
          >
            {ASSET_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-loc`}>Location (optional)</Label>
          <select
            id={`${prefix}-loc`}
            className={selectClass}
            {...f.register("locationKind")}
          >
            <option value="none">None</option>
            <option value="outlet">Outlet</option>
            <option value="warehouse">Warehouse</option>
          </select>
        </div>
        {kind === "outlet" && (
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
        {kind === "warehouse" && (
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
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-remarks`}>Remarks</Label>
          <textarea
            id={`${prefix}-remarks`}
            className={textAreaClass}
            {...f.register("remarks")}
          />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Assets</h2>
          <p className="text-sm text-muted-foreground">
            Track furniture, equipment, and other long-term operational assets.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v) form.reset(emptyForm(today));
          }}
        >
          <DialogTrigger render={<Button type="button">Add asset</Button>} />
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add asset</DialogTitle>
              <DialogDescription>
                Record purchase details and optional location.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              {renderFields(form, "a", locationKind)}
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

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={cn(selectClass, "w-full sm:w-56")}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
            <DialogTitle>Edit asset</DialogTitle>
            <DialogDescription>
              {editing ? editing.name : null}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-4">
              {renderFields(editForm, "ea", editLocationKind)}
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
            <p className="text-sm text-destructive">Failed to load assets.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !isError && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Purchase date</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="min-w-[148px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    No assets yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell>{a.categoryName}</TableCell>
                    <TableCell>{formatDay(a.purchaseDate)}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(a.purchaseCost)}
                    </TableCell>
                    <TableCell>{statusLabel(a.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.outletName || a.warehouseName || "—"}
                    </TableCell>
                    <TableCell className="min-w-[148px] whitespace-normal text-right align-middle">
                      <RowEditDeleteActions
                        busy={deleting}
                        onEdit={() => {
                          setEditing(a);
                          setEditOpen(true);
                        }}
                        onDelete={() => onDelete(a)}
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
