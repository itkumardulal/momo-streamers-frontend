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
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetOutletsQuery,
  useGetUsersQuery,
  useGetWarehousesQuery,
  useUpdateUserMutation,
} from "@/features/api/apiSlice";
import {
  selectAuth,
  selectIsSuperAdmin,
  setCredentials,
} from "@/features/auth/authSlice";
import {
  CreateUserRequest,
  User,
  UserRole,
  type UpdateUserRequest,
} from "@/entities/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { ActiveRowSwitch, ActiveSwitchField } from "@/components/active-switch-field";
import { RowEditDeleteActions } from "@/components/row-edit-delete-actions";

const userSchema = z
  .object({
    email: z.string().email().max(256),
    password: z.string().max(100),
    role: z.enum(["0", "1", "2"]),
    outletId: z.string().optional(),
    warehouseId: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role === "0" && val.password.trim().length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is required (min 6 characters)",
        path: ["password"],
      });
    }
    if (
      (val.role === "1" || val.role === "2") &&
      val.password.trim().length > 0 &&
      val.password.trim().length < 6
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must be at least 6 characters or leave blank",
        path: ["password"],
      });
    }
    if (val.role === "1" && (!val.outletId || val.outletId === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select an outlet for outlet users",
        path: ["outletId"],
      });
    }
    if (val.role === "2" && (!val.warehouseId || val.warehouseId === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a warehouse for warehouse users",
        path: ["warehouseId"],
      });
    }
  });

type UserForm = z.infer<typeof userSchema>;

const editUserSchema = z
  .object({
    email: z.string().email().max(256),
    role: z.enum(["0", "1", "2"]),
    outletId: z.string().optional(),
    warehouseId: z.string().optional(),
    isActive: z.boolean(),
  })
  .superRefine((val, ctx) => {
    if (val.role === "1" && (!val.outletId || val.outletId === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select an outlet for outlet users",
        path: ["outletId"],
      });
    }
    if (val.role === "2" && (!val.warehouseId || val.warehouseId === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a warehouse for warehouse users",
        path: ["warehouseId"],
      });
    }
  });

type EditUserForm = z.infer<typeof editUserSchema>;

function isSameUser(
  row: User,
  authUserId: string | null | undefined,
  authEmailNorm: string,
): boolean {
  const uid = authUserId?.trim();
  if (uid) return row.id === uid;
  return (
    authEmailNorm !== "" &&
    row.email.trim().toLowerCase() === authEmailNorm
  );
}

function apiRoleToFormRole(role: string): "0" | "1" | "2" {
  if (role === "SuperAdmin") return "0";
  if (role === "WarehouseUser") return "2";
  return "1";
}

function apiRoleStringToUserRole(role: string): UserRole {
  if (role === "SuperAdmin") return UserRole.SuperAdmin;
  if (role === "WarehouseUser") return UserRole.WarehouseUser;
  return UserRole.OutletUser;
}

function buildUpdatePayload(values: EditUserForm): UpdateUserRequest {
  const roleMap: Record<string, UserRole> = {
    "0": UserRole.SuperAdmin,
    "1": UserRole.OutletUser,
    "2": UserRole.WarehouseUser,
  };
  const role = roleMap[values.role];
  return {
    email: values.email.trim(),
    role,
    isActive: values.isActive,
    outletId:
      role === UserRole.OutletUser && values.outletId
        ? values.outletId
        : null,
    warehouseId:
      role === UserRole.WarehouseUser && values.warehouseId
        ? values.warehouseId
        : null,
  };
}

function rowIsActive(u: User) {
  return u.isActive !== false;
}

export default function UsersPage() {
  const dispatch = useAppDispatch();
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);
  const auth = useAppSelector(selectAuth);
  const authEmail = auth.email?.trim().toLowerCase() ?? "";
  const { data: usersRes, isLoading, isError, refetch } = useGetUsersQuery();
  const { data: outletsRes } = useGetOutletsQuery(undefined, {
    skip: !isSuperAdmin,
  });
  const { data: warehousesRes } = useGetWarehousesQuery(undefined, {
    skip: !isSuperAdmin,
  });
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [activeToggleId, setActiveToggleId] = useState<string | null>(null);

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "1",
      outletId: "",
      warehouseId: "",
    },
  });

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      email: "",
      role: "1",
      outletId: "",
      warehouseId: "",
      isActive: true,
    },
  });

  const roleWatch = form.watch("role");
  const editRoleWatch = editForm.watch("role");

  useEffect(() => {
    if (roleWatch !== "1") form.setValue("outletId", "");
    if (roleWatch !== "2") form.setValue("warehouseId", "");
  }, [roleWatch, form]);

  useEffect(() => {
    if (editRoleWatch !== "1") editForm.setValue("outletId", "");
    if (editRoleWatch !== "2") editForm.setValue("warehouseId", "");
  }, [editRoleWatch, editForm]);

  useEffect(() => {
    if (!editingUser || !editOpen) return;
    editForm.reset({
      email: editingUser.email,
      role: apiRoleToFormRole(editingUser.role),
      outletId: editingUser.outletId ?? "",
      warehouseId: editingUser.warehouseId ?? "",
      isActive: rowIsActive(editingUser),
    });
  }, [editingUser, editOpen, editForm]);

  const users = usersRes?.success ? usersRes.data ?? [] : [];
  const outlets =
    isSuperAdmin && outletsRes?.success ? outletsRes.data ?? [] : [];
  const warehouses =
    isSuperAdmin && warehousesRes?.success ? warehousesRes.data ?? [] : [];

  const onCreate = form.handleSubmit(async (values) => {
    const roleMap: Record<string, UserRole> = {
      "0": UserRole.SuperAdmin,
      "1": UserRole.OutletUser,
      "2": UserRole.WarehouseUser,
    };
    const role = roleMap[values.role];
    const trimmedPass = values.password.trim();
    const payload: CreateUserRequest = {
      email: values.email,
      role,
      outletId:
        role === UserRole.OutletUser && values.outletId
          ? values.outletId
          : null,
      warehouseId:
        role === UserRole.WarehouseUser && values.warehouseId
          ? values.warehouseId
          : null,
    };
    if (role === UserRole.SuperAdmin || trimmedPass.length > 0) {
      payload.password = trimmedPass;
    }
    try {
      const res = await createUser(payload).unwrap();
      if (res.success) {
        toast.success(res.message ?? "User created");
        setOpen(false);
        form.reset({
          email: "",
          password: "",
          role: "1",
          outletId: "",
          warehouseId: "",
        });
        return;
      }
      toast.error(res.message ?? "Could not create user");
    } catch {
      toast.error("Request failed");
    }
  });

  const onEditSave = editForm.handleSubmit(async (values) => {
    if (!editingUser) return;
    try {
      const res = await updateUser({
        id: editingUser.id,
        body: buildUpdatePayload(values),
      }).unwrap();
      if (res.success) {
        if (
          res.data &&
          auth.token &&
          isSameUser(editingUser, auth.userId, authEmail)
        ) {
          dispatch(
            setCredentials({
              userId: auth.userId ?? editingUser.id,
              token: auth.token,
              email: res.data.email,
              role: auth.role ?? "",
              warehouseId: auth.warehouseId,
              outletId: auth.outletId,
            }),
          );
        }
        toast.success(res.message ?? "User updated");
        setEditOpen(false);
        setEditingUser(null);
        return;
      }
      toast.error(res.message ?? "Could not update user");
    } catch {
      toast.error("Request failed");
    }
  });

  const openEdit = (u: User) => {
    setEditingUser(u);
    setEditOpen(true);
  };

  const onToggleActive = async (u: User, nextActive: boolean) => {
    if (isSuperAdmin && isSameUser(u, auth.userId, authEmail) && !nextActive) {
      toast.error("You cannot deactivate your own account.");
      return;
    }
    const body: UpdateUserRequest = {
      email: u.email,
      role: apiRoleStringToUserRole(u.role),
      isActive: nextActive,
      outletId: u.outletId ?? null,
      warehouseId: u.warehouseId ?? null,
    };
    setActiveToggleId(u.id);
    try {
      const res = await updateUser({ id: u.id, body }).unwrap();
      if (res.success) {
        toast.success(nextActive ? "User activated" : "User deactivated");
        return;
      }
      toast.error(res.message ?? "Could not update status");
    } catch {
      toast.error("Request failed");
    } finally {
      setActiveToggleId(null);
    }
  };

  const onDelete = async (u: User) => {
    if (isSameUser(u, auth.userId, authEmail)) {
      toast.error("You cannot delete your own account.");
      return;
    }
    if (!confirm(`Remove user ${u.email}? They will no longer be able to sign in.`))
      return;
    try {
      const res = await deleteUser(u.id).unwrap();
      if (res.success) {
        toast.success(res.message ?? "User removed");
        return;
      }
      toast.error(res.message ?? "Could not remove user");
    } catch {
      toast.error("Request failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Users</h2>
          <p className="text-sm text-muted-foreground">
            Accounts scoped to your permissions.
          </p>
        </div>
        {isSuperAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button type="button">Add user</Button>} />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New user</DialogTitle>
                <DialogDescription>
                  Super admin, warehouse user (warehouse-wide), or outlet user.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="u-email">Email</Label>
                  <Input id="u-email" type="email" {...form.register("email")} />
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-pass">Password</Label>
                  <Input
                    id="u-pass"
                    type="password"
                    autoComplete="new-password"
                    placeholder={
                      roleWatch === "1" || roleWatch === "2"
                        ? "Leave blank to email an invite link"
                        : undefined
                    }
                    {...form.register("password")}
                  />
                  {(roleWatch === "1" || roleWatch === "2") && (
                    <p className="text-xs text-muted-foreground">
                      Leave blank to send an email so they set their own password.
                    </p>
                  )}
                  {form.formState.errors.password && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="u-role">Role</Label>
                  <select
                    id="u-role"
                    className={cn(
                      "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    )}
                    {...form.register("role")}
                  >
                    <option value="1">Outlet user</option>
                    <option value="2">Warehouse user</option>
                    <option value="0">Super admin</option>
                  </select>
                </div>
                {roleWatch === "2" && (
                  <div className="space-y-2">
                    <Label htmlFor="u-wh">Warehouse</Label>
                    <select
                      id="u-wh"
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
                    {form.formState.errors.warehouseId && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.warehouseId.message}
                      </p>
                    )}
                  </div>
                )}
                {roleWatch === "1" && (
                  <div className="space-y-2">
                    <Label htmlFor="u-outlet">Outlet</Label>
                    <select
                      id="u-outlet"
                      className={cn(
                        "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      )}
                      {...form.register("outletId")}
                    >
                      <option value="">Select outlet</option>
                      {outlets.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                          {o.warehouseName ? ` (${o.warehouseName})` : ""}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.outletId && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.outletId.message}
                      </p>
                    )}
                  </div>
                )}
                <DialogFooter>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Saving…" : "Create user"}
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
          if (!v) setEditingUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update email, role, and access. Password is not changed here.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={onEditSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="eu-email">Email</Label>
                <Input
                  id="eu-email"
                  type="email"
                  autoComplete="email"
                  {...editForm.register("email")}
                />
                {editForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="eu-role">Role</Label>
                <select
                  id="eu-role"
                  className={cn(
                    "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  )}
                  {...editForm.register("role")}
                >
                  <option value="1">Outlet user</option>
                  <option value="2">Warehouse user</option>
                  <option value="0">Super admin</option>
                </select>
              </div>
              {editRoleWatch === "2" && (
                <div className="space-y-2">
                  <Label htmlFor="eu-wh">Warehouse</Label>
                  <select
                    id="eu-wh"
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
                  {editForm.formState.errors.warehouseId && (
                    <p className="text-xs text-destructive">
                      {editForm.formState.errors.warehouseId.message}
                    </p>
                  )}
                </div>
              )}
              {editRoleWatch === "1" && (
                <div className="space-y-2">
                  <Label htmlFor="eu-outlet">Outlet</Label>
                  <select
                    id="eu-outlet"
                    className={cn(
                      "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none",
                      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    )}
                    {...editForm.register("outletId")}
                  >
                    <option value="">Select outlet</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                        {o.warehouseName ? ` (${o.warehouseName})` : ""}
                      </option>
                    ))}
                  </select>
                  {editForm.formState.errors.outletId && (
                    <p className="text-xs text-destructive">
                      {editForm.formState.errors.outletId.message}
                    </p>
                  )}
                </div>
              )}
              <ActiveSwitchField
                id="eu-active"
                checked={editForm.watch("isActive")}
                onCheckedChange={(v) =>
                  editForm.setValue("isActive", v, { shouldValidate: true })
                }
                disabled={updating}
                label="Active"
                description="When inactive, the user cannot sign in."
              />
              {isSameUser(editingUser, auth.userId, authEmail) && (
                <p className="text-xs text-muted-foreground">
                  You cannot deactivate your own account here.
                </p>
              )}
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={
                    updating ||
                    (isSameUser(editingUser, auth.userId, authEmail) &&
                      editForm.watch("isActive") === false)
                  }
                >
                  {updating ? "Saving…" : "Save changes"}
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
            <p className="text-sm text-destructive">Failed to load users.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
        {!isLoading && !isError && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Outlet</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Active</TableHead>
                {isSuperAdmin && (
                  <TableHead className="min-w-[148px] text-right">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 7 : 6}
                    className="text-muted-foreground"
                  >
                    No users to show.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const active = rowIsActive(u);
                  const isSelf = isSameUser(u, auth.userId, authEmail);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>{u.role}</TableCell>
                      <TableCell>
                        {u.warehouseName ?? u.warehouseId ?? "—"}
                      </TableCell>
                      <TableCell>{u.outletName ?? u.outletId ?? "—"}</TableCell>
                      <TableCell>
                        {u.passwordSet === false ? (
                          <span className="text-amber-700">Pending invite</span>
                        ) : (
                          <span className="text-muted-foreground">Set</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {isSuperAdmin ? (
                          <ActiveRowSwitch
                            checked={active}
                            disabled={
                              activeToggleId === u.id ||
                              updating ||
                              (isSelf && active)
                            }
                            title={
                              isSelf && active
                                ? "You cannot deactivate your own account"
                                : undefined
                            }
                            onCheckedChange={(next) =>
                              onToggleActive(u, next)
                            }
                          />
                        ) : active ? (
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
                            onEdit={() => openEdit(u)}
                            onDelete={() => onDelete(u)}
                            deleteDisabled={isSelf}
                            deleteTitle={
                              isSelf
                                ? "You cannot delete your own account"
                                : undefined
                            }
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
