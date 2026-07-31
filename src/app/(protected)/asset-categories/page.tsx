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
import type { AssetCategory } from "@/entities/types";
import {
  useCreateAssetCategoryMutation,
  useDeleteAssetCategoryMutation,
  useGetAssetCategoriesQuery,
  useUpdateAssetCategoryMutation,
} from "@/features/api/apiSlice";
import { cn } from "@/lib/utils";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500).optional(),
});

type CategoryForm = z.infer<typeof categoryFormSchema>;

const textAreaClass = cn(
  "flex min-h-[72px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
);

export default function AssetCategoriesPage() {
  const { data, isLoading, isError, refetch } = useGetAssetCategoriesQuery();
  const [createCategory, { isLoading: creating }] =
    useCreateAssetCategoryMutation();
  const [updateCategory, { isLoading: updating }] =
    useUpdateAssetCategoryMutation();
  const [deleteCategory, { isLoading: deleting }] =
    useDeleteAssetCategoryMutation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AssetCategory | null>(null);
  const [search, setSearch] = useState("");

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", description: "" },
  });

  const editForm = useForm<CategoryForm>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (!editing || !editOpen) return;
    editForm.reset({
      name: editing.name,
      description: editing.description ?? "",
    });
  }, [editing, editOpen, editForm]);

  const categories = data?.success ? data.data ?? [] : [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [categories, search]);

  const onCreate = form.handleSubmit(async (values) => {
    try {
      const res = await createCategory({
        name: values.name.trim(),
        description: values.description?.trim() || null,
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Category created");
        setOpen(false);
        form.reset({ name: "", description: "" });
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
        body: {
          name: values.name.trim(),
          description: values.description?.trim() || null,
        },
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

  const onDelete = async (c: AssetCategory) => {
    if (!confirm(`Remove category "${c.name}"?`)) return;
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
            Asset categories
          </h2>
          <p className="text-sm text-muted-foreground">
            Group long-term operational assets — furniture, equipment,
            electronics, and more.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v) form.reset({ name: "", description: "" });
          }}
        >
          <DialogTrigger
            render={<Button type="button">Add category</Button>}
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add category</DialogTitle>
              <DialogDescription>
                Category names must be unique.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ac-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input id="ac-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ac-desc">Description</Label>
                <textarea
                  id="ac-desc"
                  className={textAreaClass}
                  {...form.register("description")}
                />
              </div>
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

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>
              {editing ? editing.name : null}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eac-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input id="eac-name" {...editForm.register("name")} />
                {editForm.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="eac-desc">Description</Label>
                <textarea
                  id="eac-desc"
                  className={textAreaClass}
                  {...editForm.register("description")}
                />
              </div>
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
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="min-w-[148px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    No categories yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.description || "—"}
                    </TableCell>
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
