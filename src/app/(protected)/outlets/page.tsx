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
  useCreateOutletMutation,
  useDeleteOutletMutation,
  useGetOutletsQuery,
  useGetWarehousesQuery,
  useUpdateOutletMutation,
} from "@/features/api/apiSlice";
import {
  selectAuth,
  selectCanManageOutlets,
  selectIsWarehouseUser,
} from "@/features/auth/authSlice";
import type { Outlet } from "@/entities/types";
import { useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { ActiveRowSwitch, ActiveSwitchField } from "@/components/active-switch-field";
import { RowEditDeleteActions } from "@/components/row-edit-delete-actions";

const outletSchema = z.object({
  warehouseId: z.string().min(1, "Select a warehouse"),
  name: z.string().min(1, "Name is required").max(200),
  location: z.string().min(1, "Location is required").max(500),
  isActive: z.boolean(),
});

const editOutletSchema = outletSchema.extend({
  isActive: z.boolean(),
});

type OutletForm = z.infer<typeof outletSchema>;
type EditOutletForm = z.infer<typeof editOutletSchema>;

export default function OutletsPage() {
  const auth = useAppSelector(selectAuth);
  const canManageOutlets = useAppSelector(selectCanManageOutlets);
  const isWarehouseUser = useAppSelector(selectIsWarehouseUser);
  const { data, isLoading, isError, refetch } = useGetOutletsQuery();
  const { data: warehousesRes } = useGetWarehousesQuery(undefined, {
    skip: !canManageOutlets,
  });
  const [createOutlet, { isLoading: creating }] = useCreateOutletMutation();
  const [updateOutlet, { isLoading: updating }] = useUpdateOutletMutation();
  const [deleteOutlet, { isLoading: deleting }] = useDeleteOutletMutation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Outlet | null>(null);
  const [activeToggleId, setActiveToggleId] = useState<string | null>(null);

  const warehouses =
    canManageOutlets && warehousesRes?.success ? warehousesRes.data ?? [] : [];

  const form = useForm<OutletForm>({
    resolver: zodResolver(outletSchema),
    defaultValues: {
      warehouseId: "",
      name: "",
      location: "",
      isActive: true,
    },
  });

  const editForm = useForm<EditOutletForm>({
    resolver: zodResolver(editOutletSchema),
    defaultValues: {
      warehouseId: "",
      name: "",
      location: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open || !isWarehouseUser || !auth.warehouseId) return;
    form.setValue("warehouseId", auth.warehouseId, { shouldValidate: true });
  }, [open, isWarehouseUser, auth.warehouseId, form]);

  useEffect(() => {
    if (!editing || !editOpen) return;
    editForm.reset({
      warehouseId: editing.warehouseId,
      name: editing.name,
      location: editing.location,
      isActive: editing.isActive,
    });
  }, [editing, editOpen, editForm]);

  const outlets = data?.success ? data.data ?? [] : [];

  const onCreate = form.handleSubmit(async (values) => {
    try {
      const res = await createOutlet({
        warehouseId: values.warehouseId,
        name: values.name,
        location: values.location,
        isActive: values.isActive,
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Outlet created");
        setOpen(false);
        form.reset({
          warehouseId:
            isWarehouseUser && auth.warehouseId ? auth.warehouseId : "",
          name: "",
          location: "",
          isActive: true,
        });
        return;
      }
      toast.error(res.message ?? "Could not create outlet");
    } catch {
      toast.error("Request failed");
    }
  });

  const onEditSave = editForm.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      const res = await updateOutlet({
        id: editing.id,
        body: {
          warehouseId: values.warehouseId,
          name: values.name,
          location: values.location,
          isActive: values.isActive,
        },
      }).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Outlet updated");
        setEditOpen(false);
        setEditing(null);
        return;
      }
      toast.error(res.message ?? "Could not update outlet");
    } catch {
      toast.error("Request failed");
    }
  });

  const onToggleRowActive = async (o: Outlet, nextActive: boolean) => {
    setActiveToggleId(o.id);
    try {
      const res = await updateOutlet({
        id: o.id,
        body: {
          warehouseId: o.warehouseId,
          name: o.name,
          location: o.location,
          isActive: nextActive,
        },
      }).unwrap();
      if (res.success) {
        toast.success(nextActive ? "Outlet activated" : "Outlet deactivated");
        return;
      }
      toast.error(res.message ?? "Could not update status");
    } catch {
      toast.error("Request failed");
    } finally {
      setActiveToggleId(null);
    }
  };

  const onDelete = async (o: Outlet) => {
    if (
      !confirm(
        `Remove outlet "${o.name}"? Its menu categories and items will be removed too.`,
      )
    )
      return;
    try {
      const res = await deleteOutlet(o.id).unwrap();
      if (res.success) {
        toast.success(res.message ?? "Outlet removed");
        return;
      }
      toast.error(res.message ?? "Could not remove outlet");
    } catch {
      toast.error("Request failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Outlets</h2>
          <p className="text-sm text-muted-foreground">
            Streaming locations you can access.
          </p>
        </div>
        {canManageOutlets && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button type="button">Add outlet</Button>} />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New outlet</DialogTitle>
                <DialogDescription>
                  Create a Momo streaming location.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="o-wh">Warehouse</Label>
                  {isWarehouseUser && auth.warehouseId ? (
                    <>
                      <p
                        id="o-wh"
                        className="rounded-lg border border-input bg-muted/40 px-2.5 py-2 text-sm"
                      >
                        {warehouses.find((w) => w.id === auth.warehouseId)
                          ?.name ?? "Your warehouse"}
                      </p>
                      <input
                        type="hidden"
                        {...form.register("warehouseId")}
                      />
                    </>
                  ) : (
                    <select
                      id="o-wh"
                      className={cn(
                        "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      )}
                      {...form.register("warehouseId")}
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {form.formState.errors.warehouseId && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.warehouseId.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="o-name">Name</Label>
                  <Input id="o-name" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="o-loc">Location</Label>
                  <Input id="o-loc" {...form.register("location")} />
                  {form.formState.errors.location && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.location.message}
                    </p>
                  )}
                </div>
                <ActiveSwitchField
                  id="o-active"
                  checked={form.watch("isActive")}
                  onCheckedChange={(v) =>
                    form.setValue("isActive", v, { shouldValidate: true })
                  }
                  disabled={creating}
                  label="Active"
                  description="Inactive outlets remain listed but can be excluded from operational flows."
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
            <DialogTitle>Edit outlet</DialogTitle>
            <DialogDescription>
              {editing ? editing.name : null}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={onEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eo-wh">Warehouse</Label>
                <select
                  id="eo-wh"
                  disabled={isWarehouseUser}
                  className={cn(
                    "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "disabled:cursor-not-allowed disabled:opacity-70",
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
                {editForm.formState.errors.warehouseId && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.warehouseId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="eo-name">Name</Label>
                <Input id="eo-name" {...editForm.register("name")} />
                {editForm.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="eo-loc">Location</Label>
                <Input id="eo-loc" {...editForm.register("location")} />
                {editForm.formState.errors.location && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.location.message}
                  </p>
                )}
              </div>
              <ActiveSwitchField
                id="eo-active"
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
            <p className="text-sm text-destructive">Failed to load outlets.</p>
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
                <TableHead>Warehouse</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Active</TableHead>
                {canManageOutlets && (
                  <TableHead className="min-w-[148px] text-right">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {outlets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManageOutlets ? 5 : 4}
                    className="text-muted-foreground"
                  >
                    No outlets to show.
                  </TableCell>
                </TableRow>
              ) : (
                outlets.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.name}</TableCell>
                    <TableCell>{o.warehouseName ?? o.warehouseId ?? "—"}</TableCell>
                    <TableCell>{o.location}</TableCell>
                    <TableCell className="whitespace-normal">
                      {canManageOutlets ? (
                        <ActiveRowSwitch
                          checked={o.isActive}
                          disabled={activeToggleId === o.id || updating}
                          onCheckedChange={(next) =>
                            onToggleRowActive(o, next)
                          }
                        />
                      ) : o.isActive ? (
                        <span className="text-sm font-medium text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    {canManageOutlets && (
                      <TableCell className="min-w-[148px] whitespace-normal text-right align-middle">
                        <RowEditDeleteActions
                          busy={deleting}
                          onEdit={() => {
                            setEditing(o);
                            setEditOpen(true);
                          }}
                          onDelete={() => onDelete(o)}
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
