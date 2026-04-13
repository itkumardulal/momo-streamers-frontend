"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
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
  useCreateMenuItemMutation,
  useDeleteMenuItemMutation,
  useGetCatalogItemsQuery,
  useGetMenuItemsQuery,
  useGetWarehousesQuery,
  useUpdateMenuItemMutation,
} from "@/features/api/apiSlice";
import {
  selectAuthWarehouseId,
  selectIsOutletUser,
  selectIsSuperAdmin,
  selectIsWarehouseUser,
} from "@/features/auth/authSlice";
import type { MenuItem } from "@/entities/types";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { RowEditDeleteActions } from "@/components/row-edit-delete-actions";

function formatAmount(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const menuItemFormSchema = z.object({
  warehouseId: z.string().optional(),
  catalogItemId: z.string().min(1, "Select a catalog item"),
  costPerUnit: z.number().min(0, "Must be 0 or more"),
  sellPricePerUnit: z.number().min(0, "Must be 0 or more"),
  openingStockDay1: z.number().min(0, "Must be 0 or more"),
  notes: z.string().max(2000).optional(),
});

type MenuItemForm = z.infer<typeof menuItemFormSchema>;

export default function MenuItemsPage() {
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const isWarehouseUser = useAppSelector(selectIsWarehouseUser);
  const isOutletUser = useAppSelector(selectIsOutletUser);
  const userWarehouseId = useAppSelector(selectAuthWarehouseId);
  const showWarehouseFilter = isSuperAdmin;

  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [createWarehouseId, setCreateWarehouseId] = useState("");
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);

  const listWarehouseParam = showWarehouseFilter
    ? warehouseFilter || undefined
    : undefined;

  const { data: itemsRes, isLoading, isError, refetch } =
    useGetMenuItemsQuery(listWarehouseParam);

  const needCatalogQuery = open || editOpen;
  const catalogMenuWarehouseParam = useMemo(() => {
    if (!needCatalogQuery) return undefined;
    if (editOpen && editing) return editing.warehouseId;
    if (isSuperAdmin) return createWarehouseId || warehouseFilter || undefined;
    return userWarehouseId ?? undefined;
  }, [
    needCatalogQuery,
    editOpen,
    editing,
    isSuperAdmin,
    createWarehouseId,
    warehouseFilter,
    userWarehouseId,
  ]);

  const { data: catalogRes } = useGetCatalogItemsQuery(catalogMenuWarehouseParam, {
    skip:
      !needCatalogQuery ||
      ((!userWarehouseId || userWarehouseId === "") &&
        !isSuperAdmin &&
        (isWarehouseUser || isOutletUser)),
  });

  const { data: warehousesRes } = useGetWarehousesQuery();
  const warehouses = warehousesRes?.success ? warehousesRes.data ?? [] : [];

  const [createItem, { isLoading: creating }] = useCreateMenuItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateMenuItemMutation();
  const [deleteItem, { isLoading: deleting }] = useDeleteMenuItemMutation();

  const catalogItems = useMemo(
    () => (catalogRes?.success ? catalogRes.data ?? [] : []),
    [catalogRes],
  );

  const form = useForm<MenuItemForm>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      warehouseId: "",
      catalogItemId: "",
      costPerUnit: 0,
      sellPricePerUnit: 0,
      openingStockDay1: 0,
      notes: "",
    },
  });

  const editForm = useForm<MenuItemForm>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      warehouseId: "",
      catalogItemId: "",
      costPerUnit: 0,
      sellPricePerUnit: 0,
      openingStockDay1: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      warehouseId: isSuperAdmin ? createWarehouseId : userWarehouseId ?? "",
      catalogItemId: "",
      costPerUnit: 0,
      sellPricePerUnit: 0,
      openingStockDay1: 0,
      notes: "",
    });
  }, [open, isSuperAdmin, createWarehouseId, userWarehouseId, form]);

  useEffect(() => {
    if (!editing || !editOpen) return;
    editForm.reset({
      warehouseId: editing.warehouseId,
      catalogItemId: editing.catalogItemId,
      costPerUnit: editing.costPerUnit,
      sellPricePerUnit: editing.sellPricePerUnit,
      openingStockDay1: editing.openingStockDay1,
      notes: editing.notes ?? "",
    });
  }, [editing, editOpen, editForm]);

  const items = itemsRes?.success ? itemsRes.data ?? [] : [];

  const catalogOptionsForCreate = useMemo(
    () => catalogItems.filter((c) => !c.onMenu),
    [catalogItems],
  );

  const catalogOptionsForEdit = useMemo(() => {
    if (!editing) return catalogItems;
    return catalogItems.filter((c) => !c.onMenu || c.id === editing.catalogItemId);
  }, [catalogItems, editing]);

  const onCreate = form.handleSubmit(async (values) => {
    const wh = isSuperAdmin ? createWarehouseId : (userWarehouseId ?? "");
    if (!wh || wh === "") {
      toast.error("Select a warehouse");
      return;
    }
    try {
      const res = await createItem({
        catalogItemId: values.catalogItemId,
        ...(isSuperAdmin ? { warehouseId: wh } : {}),
        costPerUnit: values.costPerUnit,
        sellPricePerUnit: values.sellPricePerUnit,
        openingStockDay1: values.openingStockDay1,
        notes: values.notes?.trim() ? values.notes.trim() : null,
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Menu item created");
        setOpen(false);
        return;
      }
      toast.error(res.message ?? "Could not create menu item");
    } catch {
      toast.error("Request failed");
    }
  });

  const onEditSave = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    const wh = values.warehouseId?.trim() || editing.warehouseId;
    if (!wh) {
      toast.error("Warehouse is required");
      return;
    }
    try {
      const res = await updateItem({
        id: editing.id,
        body: {
          catalogItemId: values.catalogItemId,
          warehouseId: wh,
          costPerUnit: values.costPerUnit,
          sellPricePerUnit: values.sellPricePerUnit,
          openingStockDay1: editing.openingStockDay1,
          notes: values.notes?.trim() ? values.notes.trim() : null,
        },
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Menu item updated");
        setEditOpen(false);
        setEditing(null);
        return;
      }
      toast.error(res.message ?? "Could not update menu item");
    } catch {
      toast.error("Request failed");
    }
  });

  const onDelete = async (row: MenuItem) => {
    if (!confirm(`Remove menu row for "${row.name}"?`)) return;
    try {
      const res = await deleteItem(row.id).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Menu item removed");
        return;
      }
      toast.error(res.message ?? "Could not remove menu item");
    } catch {
      toast.error("Request failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Menu items</h2>
          <p className="text-sm text-muted-foreground">
            One row per warehouse and catalog item: set cost, sell price,
            opening stock, and notes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {showWarehouseFilter && (
            <div className="flex items-center gap-2">
              <Label htmlFor="mi-filter" className="text-nowrap text-xs">
                Warehouse filter
              </Label>
              <select
                id="mi-filter"
                className={cn(
                  "h-8 min-w-[160px] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                )}
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                <option value="">All warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (v) {
                setCreateWarehouseId(warehouseFilter);
                form.setValue(
                  "warehouseId",
                  warehouseFilter || userWarehouseId || "",
                );
              }
            }}
          >
            <DialogTrigger render={<Button type="button">Add to menu</Button>} />
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add to menu</DialogTitle>
                <DialogDescription>
                  Pick warehouse and catalog item. Each pair can only exist once.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="mi-wh">Warehouse</Label>
                    <select
                      id="mi-wh"
                      className={cn(
                        "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      )}
                      value={createWarehouseId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCreateWarehouseId(v);
                        form.setValue("warehouseId", v);
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
                  <Label htmlFor="mi-item">Catalog item</Label>
                  <select
                    id="mi-item"
                    className={cn(
                      "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    )}
                    {...form.register("catalogItemId")}
                  >
                    <option value="">Select item</option>
                    {catalogOptionsForCreate.map((c) => (
                      <option key={c.id} value={c.id}>
                        {`${c.categoryName} — ${c.name}`}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.catalogItemId && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.catalogItemId.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="mi-cost">Cost / unit</Label>
                    <Input
                      id="mi-cost"
                      type="number"
                      step="0.01"
                      min={0}
                      {...form.register("costPerUnit", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mi-sell">Sell / unit</Label>
                    <Input
                      id="mi-sell"
                      type="number"
                      step="0.01"
                      min={0}
                      {...form.register("sellPricePerUnit", { valueAsNumber: true })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mi-stock">Opening stock (Day 1)</Label>
                  <Input
                    id="mi-stock"
                    type="number"
                    step="0.01"
                    min={0}
                    {...form.register("openingStockDay1", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mi-notes">Notes</Label>
                  <Input id="mi-notes" {...form.register("notes")} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Saving…" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
            <DialogTitle>Edit menu item</DialogTitle>
            <DialogDescription>
              {editing ? editing.name : null}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-4">
              {isSuperAdmin ? (
                <div className="space-y-2">
                  <Label htmlFor="emi-wh">Warehouse</Label>
                  <select
                    id="emi-wh"
                    className={cn(
                      "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    )}
                    {...editForm.register("warehouseId")}
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input type="hidden" {...editForm.register("warehouseId")} />
              )}
              <div className="space-y-2">
                <Label htmlFor="emi-item">Catalog item</Label>
                <select
                  id="emi-item"
                  className={cn(
                    "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                  {...editForm.register("catalogItemId")}
                >
                  <option value="">Select item</option>
                  {catalogOptionsForEdit.map((c) => (
                    <option key={c.id} value={c.id}>
                      {`${c.categoryName} — ${c.name}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emi-cost">Cost / unit</Label>
                  <Input
                    id="emi-cost"
                    type="number"
                    step="0.01"
                    min={0}
                    {...editForm.register("costPerUnit", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emi-sell">Sell / unit</Label>
                  <Input
                    id="emi-sell"
                    type="number"
                    step="0.01"
                    min={0}
                    {...editForm.register("sellPricePerUnit", { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emi-stock">Opening stock (Day 1)</Label>
                <Input
                  id="emi-stock"
                  type="number"
                  step="0.01"
                  min={0}
                  title="Opening stock is set when the menu row is created. Use warehouse production and transfers to change on-hand quantity."
                  className="cursor-not-allowed bg-muted/50"
                  {...editForm.register("openingStockDay1", { valueAsNumber: true })}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Opening stock cannot be edited here; warehouse on-hand is updated
                  via production and transfers.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emi-notes">Notes</Label>
                <Input id="emi-notes" {...editForm.register("notes")} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updating}>
                  {updating ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        )}
        {isError && (
          <div className="space-y-2 p-6">
            <p className="text-sm text-destructive">Failed to load menu items.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !isError && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead className="text-right">Cost / unit</TableHead>
                <TableHead className="text-right">Sell / unit</TableHead>
                <TableHead className="text-right">Opening stock</TableHead>
                <TableHead className="text-right">On hand (WH)</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="min-w-[148px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-muted-foreground"
                  >
                    No menu items yet. Add catalog items under Items, then add
                    rows here.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.categoryName}</TableCell>
                    <TableCell>{row.warehouseName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(row.costPerUnit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(row.sellPricePerUnit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(row.openingStockDay1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(row.quantityOnHand ?? 0)}
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate text-muted-foreground"
                      title={row.notes ?? undefined}
                    >
                      {row.notes ?? "—"}
                    </TableCell>
                    <TableCell className="min-w-[148px] whitespace-normal text-right align-middle">
                      <RowEditDeleteActions
                        busy={deleting}
                        onEdit={() => {
                          setEditing(row);
                          setEditOpen(true);
                        }}
                        onDelete={() => onDelete(row)}
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
