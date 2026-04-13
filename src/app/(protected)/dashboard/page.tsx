"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { selectAuth } from "@/features/auth/authSlice";
import { useAppSelector } from "@/store/hooks";

function scopeDescription(role: string | null) {
  switch (role) {
    case "SuperAdmin":
      return "You can see and manage all warehouses, outlets, menus, and users.";
    case "WarehouseUser":
      return "You can see outlets, menus, and users for your warehouse only.";
    case "OutletUser":
      return "You can see menus and users for your outlet only.";
    default:
      return "";
  }
}

export default function DashboardPage() {
  const auth = useAppSelector(selectAuth);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Welcome</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Signed in as{" "}
            <span className="font-medium text-foreground">{auth.email}</span>
          </p>
          <p>
            Role:{" "}
            <span className="font-medium text-foreground">{auth.role}</span>
          </p>
          {auth.role && (
            <p className="border-t border-border pt-3 leading-relaxed">
              {scopeDescription(auth.role)}
            </p>
          )}
          {auth.warehouseId && (
            <p>
              Warehouse ID:{" "}
              <span className="font-mono text-foreground">{auth.warehouseId}</span>
            </p>
          )}
          {auth.outletId && (
            <p>
              Outlet ID:{" "}
              <span className="font-mono text-foreground">{auth.outletId}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
