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
  useCreateWarehouseMutation,
  useDeleteWarehouseMutation,
  useGetWarehousesQuery,
  useUpdateWarehouseMutation,
} from "@/features/api/apiSlice";
import { selectIsSuperAdmin } from "@/features/auth/authSlice";
import type { Warehouse } from "@/entities/types";
import { useAppSelector } from "@/store/hooks";
import { ActiveRowSwitch, ActiveSwitchField } from "@/components/active-switch-field";
import { RowEditDeleteActions } from "@/components/row-edit-delete-actions";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  location: z.string().min(1, "Location is required").max(500),
  isActive: z.boolean(),
});

const editSchema = schema.extend({
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;
type EditFormValues = z.infer<typeof editSchema>;

export default function WarehousesPage() {
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const { data, isLoading, isError, refetch } = useGetWarehousesQuery();
  const [createWh, { isLoading: creating }] = useCreateWarehouseMutation();
  const [updateWh, { isLoading: updating }] = useUpdateWarehouseMutation();
  const [deleteWh, { isLoading: deleting }] = useDeleteWarehouseMutation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [activeToggleId, setActiveToggleId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", location: "", isActive: true },
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", location: "", isActive: true },
  });

  useEffect(() => {
    if (!editing || !editOpen) return;
    editForm.reset({
      name: editing.name,
      location: editing.location,
      isActive: editing.isActive,
    });
  }, [editing, editOpen, editForm]);

  const list = data?.success ? data.data ?? [] : [];

  const onCreate = form.handleSubmit(async (values) => {
    try {
      const res = await createWh({
        name: values.name,
        location: values.location,
        isActive: values.isActive,
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Warehouse created");
        setOpen(false);
        form.reset({ name: "", location: "", isActive: true });
        return;
      }
      toast.error(res.message ?? "Could not create warehouse");
    } catch {
      toast.error("Request failed");
    }
  });

  const onEditSave = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      const res = await updateWh({
        id: editing.id,
        body: {
          name: values.name,
          location: values.location,
          isActive: values.isActive,
        },
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Warehouse updated");
        setEditOpen(false);
        setEditing(null);
        return;
      }
      toast.error(res.message ?? "Could not update warehouse");
    } catch {
      toast.error("Request failed");
    }
  });

  const onToggleRowActive = async (w: Warehouse, nextActive: boolean) => {
    setActiveToggleId(w.id);
    try {
      const res = await updateWh({
        id: w.id,
        body: {
          name: w.name,
          location: w.location,
          isActive: nextActive,
        },
      }).unwrap();
      if (res.success) {
        toast.success(nextActive ? "Warehouse activated" : "Warehouse deactivated");
        return;
      }
      toast.error(res.message ?? "Could not update status");
    } catch {
      toast.error("Request failed");
    } finally {
      setActiveToggleId(null);
    }
  };

  const onDelete = async (w: Warehouse) => {
    if (
      !confirm(
        `Remove warehouse "${w.name}"? You must remove or move its outlets first.`,
      )
    )
      return;
    try {
      const res = await deleteWh(w.id).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Warehouse removed");
        return;
      }
      toast.error(res.message ?? "Could not remove warehouse");
    } catch {
      toast.error("Request failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Warehouses</h2>
          <p className="text-sm text-muted-foreground">
            Distribution centers; outlets belong to a warehouse.
          </p>
        </div>
        {isSuperAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button type="button">Add warehouse</Button>} />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New warehouse</DialogTitle>
                <DialogDescription>
                  Create a warehouse, then add outlets under it.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="w-name">Name</Label>
                  <Input id="w-name" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="w-loc">Location</Label>
                  <Input id="w-loc" {...form.register("location")} />
                  {form.formState.errors.location && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.location.message}
                    </p>
                  )}
                </div>
                <ActiveSwitchField
                  id="w-active"
                  checked={form.watch("isActive")}
                  onCheckedChange={(v) =>
                    form.setValue("isActive", v, { shouldValidate: true })
                  }
                  disabled={creating}
                  label="Active"
                  description="Inactive warehouses stay in the list but can be hidden from day-to-day use."
                />
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Saving…" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
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
            <DialogTitle>Edit warehouse</DialogTitle>
            <DialogDescription>
              {editing ? editing.name : null}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ew-name">Name</Label>
                <Input id="ew-name" {...editForm.register("name")} />
                {editForm.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ew-loc">Location</Label>
                <Input id="ew-loc" {...editForm.register("location")} />
                {editForm.formState.errors.location && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.location.message}
                  </p>
                )}
              </div>
              <ActiveSwitchField
                id="ew-active"
                checked={editForm.watch("isActive")}
                onCheckedChange={(v) =>
                  editForm.setValue("isActive", v, { shouldValidate: true })
                }
                disabled={updating}
                label="Active"
              />
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
            <p className="text-sm text-destructive">Failed to load warehouses.</p>
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
                <TableHead>Location</TableHead>
                <TableHead>Active</TableHead>
                {isSuperAdmin && (
                  <TableHead className="min-w-[148px] text-right">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 4 : 3}
                    className="text-muted-foreground"
                  >
                    No warehouses to show.
                  </TableCell>
                </TableRow>
              ) : (
                list.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell>{w.location}</TableCell>
                    <TableCell className="whitespace-normal">
                      {isSuperAdmin ? (
                        <ActiveRowSwitch
                          checked={w.isActive}
                          disabled={activeToggleId === w.id || updating}
                          onCheckedChange={(next) =>
                            onToggleRowActive(w, next)
                          }
                        />
                      ) : w.isActive ? (
                        <span className="text-sm font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="min-w-[148px] whitespace-normal text-right align-middle">
                        <RowEditDeleteActions
                          busy={deleting}
                          onEdit={() => {
                            setEditing(w);
                            setEditOpen(true);
                          }}
                          onDelete={() => onDelete(w)}
                        />
                      </TableCell>
                    )}
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
