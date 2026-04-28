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
  useCreateCatalogItemMutation,
  useDeleteCatalogItemMutation,
  useGetCatalogItemsQuery,
  useGetMenuCategoriesQuery,
  useUpdateCatalogItemMutation,
} from "@/features/api/apiSlice";
import type { CatalogItem } from "@/entities/types";
import { cn } from "@/lib/utils";
import { RowEditDeleteActions } from "@/components/row-edit-delete-actions";

const itemFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  menuCategoryId: z.string().min(1, "Select a category"),
});

type ItemForm = z.infer<typeof itemFormSchema>;

export default function CatalogItemsPage() {
  const { data: itemsRes, isLoading, isError, refetch } =
    useGetCatalogItemsQuery(undefined);
  const { data: categoriesRes } = useGetMenuCategoriesQuery();
  const [createItem, { isLoading: creating }] = useCreateCatalogItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateCatalogItemMutation();
  const [deleteItem, { isLoading: deleting }] = useDeleteCatalogItemMutation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);

  const categories = useMemo(
    () => (categoriesRes?.success ? categoriesRes.data ?? [] : []),
    [categoriesRes],
  );

  const form = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { name: "", menuCategoryId: "" },
  });

  const editForm = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: { name: "", menuCategoryId: "" },
  });

  useEffect(() => {
    if (!editing || !editOpen) return;
    editForm.reset({
      name: editing.name,
      menuCategoryId: editing.menuCategoryId,
    });
  }, [editing, editOpen, editForm]);

  const items = itemsRes?.success ? itemsRes.data ?? [] : [];

  const onCreate = form.handleSubmit(async (values) => {
    try {
      const res = await createItem({
        name: values.name.trim(),
        menuCategoryId: values.menuCategoryId,
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Item created");
        setOpen(false);
        form.reset({ name: "", menuCategoryId: "" });
        return;
      }
      toast.error(res.message ?? "Could not create item");
    } catch {
      toast.error("Request failed");
    }
  });

  const onEditSave = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      const res = await updateItem({
        id: editing.id,
        body: {
          name: values.name.trim(),
          menuCategoryId: values.menuCategoryId,
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

  const onDelete = async (row: CatalogItem) => {
    if (!confirm(`Delete item "${row.name}"?`)) return;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Items</h2>
          <p className="text-sm text-muted-foreground">
            Shared catalog by category. Add items to an outlet menu from Menu
            items.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v) form.reset({ name: "", menuCategoryId: "" });
          }}
        >
          <DialogTrigger render={<Button type="button">Add item</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New item</DialogTitle>
              <DialogDescription>
                Choose a category and name. Names must be unique within a
                category.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ci-name">Name</Label>
                <Input id="ci-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ci-cat">Category</Label>
                <select
                  id="ci-cat"
                  className={cn(
                    "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                  {...form.register("menuCategoryId")}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {form.formState.errors.menuCategoryId && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.menuCategoryId.message}
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
            <DialogTitle>Edit item</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eci-name">Name</Label>
                <Input id="eci-name" {...editForm.register("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eci-cat">Category</Label>
                <select
                  id="eci-cat"
                  className={cn(
                    "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                  {...editForm.register("menuCategoryId")}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
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
            <p className="text-sm text-destructive">Failed to load items.</p>
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
                <TableHead>On any menu</TableHead>
                <TableHead className="min-w-[148px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No items yet. Create categories first, then add items here.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.categoryName}</TableCell>
                    <TableCell>{row.onMenu ? "Yes" : "No"}</TableCell>
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
