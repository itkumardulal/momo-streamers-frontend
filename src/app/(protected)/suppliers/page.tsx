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
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useGetSuppliersQuery,
  useUpdateSupplierMutation,
} from "@/features/api/apiSlice";
import type { Supplier } from "@/entities/types";
import { SupplierPurchaseContext } from "@/entities/types";
import { cn } from "@/lib/utils";
import { RowEditDeleteActions } from "@/components/row-edit-delete-actions";

const supplierFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  purchaseContext: z.nativeEnum(SupplierPurchaseContext),
  contactPerson: z.string().max(200, "Max 200 characters").optional(),
  phone: z.string().max(50, "Max 50 characters").optional(),
  email: z.string().max(256, "Max 256 characters").optional(),
  address: z.string().max(500, "Max 500 characters").optional(),
  notes: z.string().max(2000, "Max 2000 characters").optional(),
});

type SupplierForm = z.infer<typeof supplierFormSchema>;

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

function cellOrDash(value: string | null | undefined) {
  const t = value?.trim();
  return t ? t : "—";
}

function purchaseContextLabel(c: SupplierPurchaseContext | number) {
  switch (c) {
    case SupplierPurchaseContext.WarehouseOnly:
      return "Warehouse purchases only";
    case SupplierPurchaseContext.OutletOnly:
      return "Outlet purchases only";
    default:
      return "Both warehouse and outlet";
  }
}

export default function SuppliersPage() {
  const { data: res, isLoading, isError, refetch } =
    useGetSuppliersQuery(undefined);
  const [createSupplier, { isLoading: creating }] =
    useCreateSupplierMutation();
  const [updateSupplier, { isLoading: updating }] =
    useUpdateSupplierMutation();
  const [deleteSupplier, { isLoading: deleting }] =
    useDeleteSupplierMutation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const form = useForm<SupplierForm>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      purchaseContext: SupplierPurchaseContext.Both,
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  const editForm = useForm<SupplierForm>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      purchaseContext: SupplierPurchaseContext.Both,
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!editing || !editOpen) return;
    editForm.reset({
      name: editing.name,
      purchaseContext:
        editing.purchaseContext ?? SupplierPurchaseContext.Both,
      contactPerson: editing.contactPerson ?? "",
      phone: editing.phone ?? "",
      email: editing.email ?? "",
      address: editing.address ?? "",
      notes: editing.notes ?? "",
    });
  }, [editing, editOpen, editForm]);

  const rows = res?.success ? res.data ?? [] : [];

  const optional = (v: string | undefined) => {
    const t = v?.trim();
    return t ? t : null;
  };

  const onCreate = form.handleSubmit(async (values) => {
    try {
      const r = await createSupplier({
        name: values.name.trim(),
        purchaseContext: values.purchaseContext as SupplierPurchaseContext,
        contactPerson: optional(values.contactPerson),
        phone: optional(values.phone),
        email: optional(values.email),
        address: optional(values.address),
        notes: optional(values.notes),
      }).unwrap();
      if (r.success) {
        toast.success(r.message ?? "Supplier created");
        setOpen(false);
        form.reset({
          name: "",
          purchaseContext: SupplierPurchaseContext.Both,
          contactPerson: "",
          phone: "",
          email: "",
          address: "",
          notes: "",
        });
        return;
      }
      toast.error(r.message ?? "Could not create supplier");
    } catch {
      toast.error("Request failed");
    }
  });

  const onEditSave = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      const r = await updateSupplier({
        id: editing.id,
        body: {
          name: values.name.trim(),
          purchaseContext: values.purchaseContext as SupplierPurchaseContext,
          contactPerson: optional(values.contactPerson),
          phone: optional(values.phone),
          email: optional(values.email),
          address: optional(values.address),
          notes: optional(values.notes),
        },
      }).unwrap();
      if (r.success) {
        toast.success(r.message ?? "Supplier updated");
        setEditOpen(false);
        setEditing(null);
        return;
      }
      toast.error(r.message ?? "Could not update supplier");
    } catch {
      toast.error("Request failed");
    }
  });

  const onDelete = async (row: Supplier) => {
    if (!confirm(`Delete supplier "${row.name}"?`)) return;
    try {
      const r = await deleteSupplier(row.id).unwrap();
      if (r.success) {
        toast.success(r.message ?? "Supplier removed");
        return;
      }
      toast.error(r.message ?? "Could not remove supplier");
    } catch {
      toast.error("Request failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Suppliers</h2>
          <p className="text-sm text-muted-foreground">
            Company-wide vendor list. Names must be unique. Contact fields are
            optional.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (v) {
              form.reset({
                name: "",
                purchaseContext: SupplierPurchaseContext.Both,
                contactPerson: "",
                phone: "",
                email: "",
                address: "",
                notes: "",
              });
            }
          }}
        >
          <DialogTrigger render={<Button type="button">Add supplier</Button>} />
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New supplier</DialogTitle>
              <DialogDescription>
                Add a unique supplier name and optional contact details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sup-name">Name</Label>
                <Input id="sup-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-pc">Purchase context</Label>
                <select
                  id="sup-pc"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  {...form.register("purchaseContext", { valueAsNumber: true })}
                >
                  <option value={SupplierPurchaseContext.Both}>
                    Both (warehouse and outlet)
                  </option>
                  <option value={SupplierPurchaseContext.WarehouseOnly}>
                    Warehouse raw-material purchases only
                  </option>
                  <option value={SupplierPurchaseContext.OutletOnly}>
                    Outlet purchases only
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-contact">Contact person (optional)</Label>
                <Input id="sup-contact" {...form.register("contactPerson")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-phone">Phone (optional)</Label>
                <Input id="sup-phone" {...form.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-email">Email (optional)</Label>
                <Input
                  id="sup-email"
                  type="email"
                  {...form.register("email")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-address">Address (optional)</Label>
                <textarea
                  id="sup-address"
                  className={textAreaClass}
                  rows={2}
                  {...form.register("address")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sup-notes">Notes (optional)</Label>
                <textarea
                  id="sup-notes"
                  className={textAreaClass}
                  rows={3}
                  {...form.register("notes")}
                />
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit supplier</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="esup-name">Name</Label>
                <Input id="esup-name" {...editForm.register("name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esup-pc">Purchase context</Label>
                <select
                  id="esup-pc"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  {...editForm.register("purchaseContext", { valueAsNumber: true })}
                >
                  <option value={SupplierPurchaseContext.Both}>
                    Both (warehouse and outlet)
                  </option>
                  <option value={SupplierPurchaseContext.WarehouseOnly}>
                    Warehouse raw-material purchases only
                  </option>
                  <option value={SupplierPurchaseContext.OutletOnly}>
                    Outlet purchases only
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="esup-contact">Contact person</Label>
                <Input id="esup-contact" {...editForm.register("contactPerson")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esup-phone">Phone</Label>
                <Input id="esup-phone" {...editForm.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esup-email">Email</Label>
                <Input
                  id="esup-email"
                  type="email"
                  {...editForm.register("email")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esup-address">Address</Label>
                <textarea
                  id="esup-address"
                  className={textAreaClass}
                  rows={2}
                  {...editForm.register("address")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="esup-notes">Notes</Label>
                <textarea
                  id="esup-notes"
                  className={textAreaClass}
                  rows={3}
                  {...editForm.register("notes")}
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
            <p className="text-sm text-destructive">Failed to load suppliers.</p>
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
                <TableHead className="min-w-[200px]">Purchases</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden lg:table-cell">Address</TableHead>
                <TableHead className="whitespace-nowrap">Added</TableHead>
                <TableHead className="min-w-[148px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-muted-foreground"
                  >
                    No suppliers yet. Add your first one above.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {purchaseContextLabel(
                        row.purchaseContext ?? SupplierPurchaseContext.Both,
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cellOrDash(row.contactPerson)}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {cellOrDash(row.phone)}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-muted-foreground">
                      {cellOrDash(row.email)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px] truncate text-muted-foreground">
                      {cellOrDash(row.address)}
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
