"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
  useCreateOutletItemMutation,
  useDeleteOutletItemMutation,
  useGetOutletItemsQuery,
  useUpdateOutletItemMutation,
} from "@/features/api/apiSlice";
import { OutletItemType, type OutletItem } from "@/entities/types";
import {
  selectCanManageOutletItems,
  selectCanViewOutletItemsCatalog,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { RowEditDeleteActions } from "@/components/row-edit-delete-actions";

const itemFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  unit: z.string().max(30, "Max 30 characters").optional(),
  description: z.string().max(500, "Max 500 characters").optional(),
  itemType: z.nativeEnum(OutletItemType),
  costPrice: z.number().min(0, "Cost price cannot be negative"),
  defaultSellPrice: z.number().min(0, "Price cannot be negative"),
});

type ItemForm = z.infer<typeof itemFormSchema>;

const textAreaClass = cn(
  "flex min-h-[72px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
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

export default function OutletItemsPage() {
  const canView = useAppSelector(selectCanViewOutletItemsCatalog);
  const canManage = useAppSelector(selectCanManageOutletItems);
  const { data: itemsRes, isLoading, isError, refetch } = useGetOutletItemsQuery();
  const [createItem, { isLoading: creating }] = useCreateOutletItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateOutletItemMutation();
  const [deleteItem, { isLoading: deleting }] = useDeleteOutletItemMutation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<OutletItem | null>(null);

  const form = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      unit: "",
      description: "",
      itemType: OutletItemType.Sale,
      costPrice: 0,
      defaultSellPrice: 0,
    },
  });

  const editForm = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      unit: "",
      description: "",
      itemType: OutletItemType.Sale,
      costPrice: 0,
      defaultSellPrice: 0,
    },
  });

  useEffect(() => {
    if (!editing || !editOpen) return;
    editForm.reset({
      name: editing.name,
      unit: editing.unit ?? "",
      description: editing.description ?? "",
      itemType: editing.itemType,
      costPrice: editing.costPrice,
      defaultSellPrice: editing.defaultSellPrice,
    });
  }, [editing, editOpen, editForm]);

  const items = itemsRes?.success ? itemsRes.data ?? [] : [];

  const onCreate = form.handleSubmit(async (values) => {
    const unit = values.unit?.trim() || null;
    const description = values.description?.trim() || null;
    try {
      const res = await createItem({
        name: values.name.trim(),
        unit,
        description,
        itemType: values.itemType,
        costPrice: values.costPrice,
        defaultSellPrice: values.defaultSellPrice,
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Item created");
        setOpen(false);
        form.reset({
          name: "",
          unit: "",
          description: "",
          itemType: OutletItemType.Sale,
          costPrice: 0,
          defaultSellPrice: 0,
        });
        return;
      }
      toast.error(res.message ?? "Could not create item");
    } catch {
      toast.error("Request failed");
    }
  });

  const onEditSave = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    const unit = values.unit?.trim() || null;
    const description = values.description?.trim() || null;
    try {
      const res = await updateItem({
        id: editing.id,
        body: {
          name: values.name.trim(),
          unit,
          description,
          itemType: values.itemType,
          costPrice: values.costPrice,
          defaultSellPrice: values.defaultSellPrice,
        },
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Item updated");
        setEditOpen(false);
        setEditing(null);
        return;
      }
      toast.error(res.message ?? "Could not update item");
    } catch {
      toast.error("Request failed");
    }
  });

  const onDelete = async (row: OutletItem) => {
    if (!confirm(`Delete outlet item "${row.name}"?`)) return;
    try {
      const res = await deleteItem(row.id).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Item removed");
        return;
      }
      toast.error(res.message ?? "Could not remove item");
    } catch {
      toast.error("Request failed");
    }
  };

  if (!canView) {
    return (
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Outlet items</h2>
        <p className="text-sm text-muted-foreground">
          You do not have access to view outlet retail items.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Outlet items</h2>
          <p className="text-sm text-muted-foreground">
            Direct retail SKUs for outlet purchases and POS (not menu items).
            {!canManage && " You can browse the catalog; only admins can edit."}
          </p>
        </div>
        {canManage ? (
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v) {
              form.reset({
                name: "",
                unit: "",
                description: "",
                itemType: OutletItemType.Sale,
                costPrice: 0,
                defaultSellPrice: 0,
              });
            }
          }}
        >
          <DialogTrigger render={<Button type="button">Add outlet item</Button>} />
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New outlet item</DialogTitle>
              <DialogDescription>
                Unique name, optional unit/description, default sell price for POS.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oi-name">Name</Label>
                <Input id="oi-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="oi-unit">Unit (optional)</Label>
                <Input id="oi-unit" {...form.register("unit")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oi-desc">Description (optional)</Label>
                <textarea
                  id="oi-desc"
                  className={textAreaClass}
                  rows={2}
                  {...form.register("description")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oi-type">Item type</Label>
                <select
                  id="oi-type"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={String(form.watch("itemType"))}
                  onChange={(e) =>
                    form.setValue("itemType", Number(e.target.value) as OutletItemType)
                  }
                >
                  <option value={String(OutletItemType.Sale)}>Sale</option>
                  <option value={String(OutletItemType.NonSale)}>Non-sale</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="oi-cost-price">Cost price</Label>
                <Input
                  id="oi-cost-price"
                  type="number"
                  step="0.01"
                  min={0}
                  {...form.register("costPrice", { valueAsNumber: true })}
                />
                {form.formState.errors.costPrice && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.costPrice.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="oi-price">Default sell price</Label>
                <Input
                  id="oi-price"
                  type="number"
                  step="0.01"
                  min={0}
                  {...form.register("defaultSellPrice", { valueAsNumber: true })}
                />
                {form.formState.errors.defaultSellPrice && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.defaultSellPrice.message}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating ? "Saving…" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        ) : null}
      </div>

      {canManage ? (
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit outlet item</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eoi-name">Name</Label>
                <Input id="eoi-name" {...editForm.register("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eoi-unit">Unit</Label>
                <Input id="eoi-unit" {...editForm.register("unit")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eoi-desc">Description</Label>
                <textarea
                  id="eoi-desc"
                  className={textAreaClass}
                  rows={2}
                  {...editForm.register("description")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eoi-type">Item type</Label>
                <select
                  id="eoi-type"
                  className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={String(editForm.watch("itemType"))}
                  onChange={(e) =>
                    editForm.setValue("itemType", Number(e.target.value) as OutletItemType)
                  }
                >
                  <option value={String(OutletItemType.Sale)}>Sale</option>
                  <option value={String(OutletItemType.NonSale)}>Non-sale</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eoi-cost-price">Cost price</Label>
                <Input
                  id="eoi-cost-price"
                  type="number"
                  step="0.01"
                  min={0}
                  {...editForm.register("costPrice", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eoi-price">Default sell price</Label>
                <Input
                  id="eoi-price"
                  type="number"
                  step="0.01"
                  min={0}
                  {...editForm.register("defaultSellPrice", { valueAsNumber: true })}
                />
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
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        )}
        {isError && (
          <div className="space-y-2 p-6">
            <p className="text-sm text-destructive">Failed to load outlet items.</p>
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
                <TableHead>Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Cost price</TableHead>
                <TableHead className="text-right">Sales price</TableHead>
                <TableHead className="whitespace-nowrap">Added</TableHead>
                {canManage ? (
                  <TableHead className="min-w-[148px] text-right">Actions</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 7 : 6}
                    className="text-muted-foreground"
                  >
                    No outlet items yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-sm">
                      {row.itemType === OutletItemType.Sale ? "Sale" : "Non-sale"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.unit?.trim() ? row.unit : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.costPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.defaultSellPrice)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        <RowEditDeleteActions
                          busy={deleting}
                          onEdit={() => {
                            setEditing(row);
                            setEditOpen(true);
                          }}
                          onDelete={() => onDelete(row)}
                        />
                      </TableCell>
                    ) : null}
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
