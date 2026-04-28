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
  useCreateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useGetMenuCategoriesQuery,
  useUpdateMenuCategoryMutation,
} from "@/features/api/apiSlice";
import type { MenuCategory } from "@/entities/types";
import { RowEditDeleteActions } from "@/components/row-edit-delete-actions";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
});

type CategoryForm = z.infer<typeof categoryFormSchema>;

export default function MenuCategoriesPage() {
  const { data, isLoading, isError, refetch } = useGetMenuCategoriesQuery();
  const [createCategory, { isLoading: creating }] =
    useCreateMenuCategoryMutation();
  const [updateCategory, { isLoading: updating }] =
    useUpdateMenuCategoryMutation();
  const [deleteCategory, { isLoading: deleting }] =
    useDeleteMenuCategoryMutation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MenuCategory | null>(null);

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  const editForm = useForm<CategoryForm>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (!editing || !editOpen) return;
    editForm.reset({ name: editing.name });
  }, [editing, editOpen, editForm]);

  const categories = data?.success ? data.data ?? [] : [];

  const onCreate = form.handleSubmit(async (values) => {
    try {
      const res = await createCategory({
        name: values.name.trim(),
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Category created");
        setOpen(false);
        form.reset({ name: "" });
        return;
      }
      toast.error(res.message ?? "Could not create category");
    } catch {
      toast.error("Request failed");
    }
  });

  const onEditSave = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      const res = await updateCategory({
        id: editing.id,
        body: { name: values.name.trim() },
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Category updated");
        setEditOpen(false);
        setEditing(null);
        return;
      }
      toast.error(res.message ?? "Could not update category");
    } catch {
      toast.error("Request failed");
    }
  });

  const onDelete = async (c: MenuCategory) => {
    if (
      !confirm(
        `Remove category "${c.name}"? All items in this category will be removed.`,
      )
    )
      return;
    try {
      const res = await deleteCategory(c.id).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Category removed");
        return;
      }
      toast.error(res.message ?? "Could not remove category");
    } catch {
      toast.error("Request failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Menu categories
          </h2>
          <p className="text-sm text-muted-foreground">
            Shared category names (e.g. Steam, Fry, Drinks). Catalog items are
            created per outlet under a category.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button type="button">Add category</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New menu category</DialogTitle>
              <DialogDescription>
                Category names must be unique across the company.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mc-name">Category</Label>
                <Input id="mc-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
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
            <DialogTitle>Edit menu category</DialogTitle>
            <DialogDescription>
              {editing ? editing.name : null}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emc-name">Category</Label>
                <Input id="emc-name" {...editForm.register("name")} />
                {editForm.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
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

      <div className="rounded-lg border border-border bg-white shadow-sm">
        {isLoading && (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        )}
        {isError && (
          <div className="space-y-2 p-6">
            <p className="text-sm text-destructive">
              Failed to load categories.
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
                <TableHead>Category</TableHead>
                <TableHead className="min-w-[148px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No categories yet.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="min-w-[148px] whitespace-normal text-right align-middle">
                      <RowEditDeleteActions
                        busy={deleting}
                        onEdit={() => {
                          setEditing(c);
                          setEditOpen(true);
                        }}
                        onDelete={() => onDelete(c)}
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
