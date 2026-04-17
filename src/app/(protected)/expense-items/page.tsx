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
  useCreateExpenseItemMutation,
  useDeleteExpenseItemMutation,
  useGetExpenseItemsQuery,
  useUpdateExpenseItemMutation,
} from "@/features/api/apiSlice";
import type { ExpenseItem } from "@/entities/types";
import {
  MONTHLY_SHEET_CATEGORY_OPTIONS,
  MonthlySheetExpenseCategory,
} from "@/entities/types";
import { cn } from "@/lib/utils";
import { RowEditDeleteActions } from "@/components/row-edit-delete-actions";

const itemFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(500, "Max 500 characters").optional(),
  monthlySheetExpenseCategory: z.nativeEnum(MonthlySheetExpenseCategory),
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

export default function ExpenseItemsPage() {
  const { data: itemsRes, isLoading, isError, refetch } =
    useGetExpenseItemsQuery();
  const [createItem, { isLoading: creating }] = useCreateExpenseItemMutation();
  const [updateItem, { isLoading: updating }] = useUpdateExpenseItemMutation();
  const [deleteItem, { isLoading: deleting }] = useDeleteExpenseItemMutation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseItem | null>(null);

  const form = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      description: "",
      monthlySheetExpenseCategory: MonthlySheetExpenseCategory.None,
    },
  });

  const editForm = useForm<ItemForm>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      description: "",
      monthlySheetExpenseCategory: MonthlySheetExpenseCategory.None,
    },
  });

  useEffect(() => {
    if (!editing || !editOpen) return;
    editForm.reset({
      name: editing.name,
      description: editing.description ?? "",
      monthlySheetExpenseCategory:
        editing.monthlySheetExpenseCategory ?? MonthlySheetExpenseCategory.None,
    });
  }, [editing, editOpen, editForm]);

  const items = itemsRes?.success ? itemsRes.data ?? [] : [];

  const onCreate = form.handleSubmit(async (values) => {
    const description = values.description?.trim() || null;
    try {
      const res = await createItem({
        name: values.name.trim(),
        description,
        monthlySheetExpenseCategory: values.monthlySheetExpenseCategory,
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Item created");
        setOpen(false);
        form.reset({
          name: "",
          description: "",
          monthlySheetExpenseCategory: MonthlySheetExpenseCategory.None,
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
    const description = values.description?.trim() || null;
    try {
      const res = await updateItem({
        id: editing.id,
        body: {
          name: values.name.trim(),
          description,
          monthlySheetExpenseCategory: values.monthlySheetExpenseCategory,
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

  const onDelete = async (row: ExpenseItem) => {
    if (!confirm(`Delete expense item "${row.name}"?`)) return;
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
          <h2 className="text-xl font-semibold text-foreground">
            Expense items
          </h2>
          <p className="text-sm text-muted-foreground">
            Company-wide expense line items. Names must be unique. Add optional
            notes for context.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v)
              form.reset({
                name: "",
                description: "",
                monthlySheetExpenseCategory: MonthlySheetExpenseCategory.None,
              });
          }}
        >
          <DialogTrigger render={<Button type="button">Add item</Button>} />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New expense item</DialogTitle>
              <DialogDescription>
                Add a unique name. Map to a monthly sheet row so daily expenses roll
                up into the P&L report.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ei-name">Name</Label>
                <Input id="ei-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ei-cat">Monthly sheet category</Label>
                <select
                  id="ei-cat"
                  className={cn(
                    "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                  {...form.register("monthlySheetExpenseCategory", {
                    valueAsNumber: true,
                  })}
                >
                  {MONTHLY_SHEET_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {form.formState.errors.monthlySheetExpenseCategory && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.monthlySheetExpenseCategory.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ei-desc">Description (optional)</Label>
                <textarea
                  id="ei-desc"
                  className={textAreaClass}
                  rows={3}
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.description.message}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit expense item</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eei-name">Name</Label>
                <Input id="eei-name" {...editForm.register("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eei-cat">Monthly sheet category</Label>
                <select
                  id="eei-cat"
                  className={cn(
                    "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                  {...editForm.register("monthlySheetExpenseCategory", {
                    valueAsNumber: true,
                  })}
                >
                  {MONTHLY_SHEET_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eei-desc">Description (optional)</Label>
                <textarea
                  id="eei-desc"
                  className={textAreaClass}
                  rows={3}
                  {...editForm.register("description")}
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
                <TableHead>Monthly sheet</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="min-w-[148px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    No expense items yet. Add your first item above.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                      {MONTHLY_SHEET_CATEGORY_OPTIONS.find(
                        (o) =>
                          o.value ===
                          (row.monthlySheetExpenseCategory ??
                            MonthlySheetExpenseCategory.None),
                      )?.label ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">
                      {row.description || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {formatDate(row.createdAt)}
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
