"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  Building2,
  ChevronDown,
  ClipboardPlus,
  BarChart3,
  Handshake,
  LayoutDashboard,
  LogOut,
  MapPin,
  Package,
  Receipt,
  ShoppingCart,
  Tags,
  Truck,
  UtensilsCrossed,
  User,
  Users,
  Store,
  ShoppingBag,
  ScanLine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiSlice } from "@/features/api/apiSlice";
import {
  logout,
  normalizeAuthRole,
  selectAuth,
} from "@/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type NavKey =
  | "dashboard"
  | "warehouses"
  | "outlets"
  | "users"
  | "rawMaterials"
  | "suppliers"
  | "rawMaterialPurchases"
  | "warehouseProduction"
  | "menuCategories"
  | "catalogItems"
  | "menuItems"
  | "warehouseTransfers"
  | "outletItems"
  | "outletPurchases"
  | "outletPos"
  | "expenseItems"
  | "reports";

const NAV_META: Record<
  NavKey,
  { href: string; label: string; icon: LucideIcon }
> = {
  dashboard: { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  warehouses: { href: "/warehouses", label: "Warehouses", icon: Building2 },
  outlets: { href: "/outlets", label: "Outlets", icon: MapPin },
  users: { href: "/users", label: "Users", icon: Users },
  rawMaterials: {
    href: "/raw-material-items",
    label: "Raw materials",
    icon: Boxes,
  },
  suppliers: { href: "/suppliers", label: "Suppliers", icon: Handshake },
  rawMaterialPurchases: {
    href: "/raw-material-purchases",
    label: "Raw material purchases",
    icon: ShoppingCart,
  },
  warehouseProduction: {
    href: "/warehouse-production",
    label: "Warehouse production",
    icon: ClipboardPlus,
  },
  menuCategories: {
    href: "/menu-categories",
    label: "Menu categories",
    icon: Tags,
  },
  catalogItems: {
    href: "/catalog-items",
    label: "Catalog items",
    icon: Package,
  },
  menuItems: { href: "/menu-items", label: "Menu items", icon: UtensilsCrossed },
  warehouseTransfers: {
    href: "/warehouse-transfers",
    label: "Warehouse transfers",
    icon: Truck,
  },
  outletItems: { href: "/outlet-items", label: "Outlet items", icon: Store },
  outletPurchases: {
    href: "/outlet-item-purchases",
    label: "Outlet purchases",
    icon: ShoppingBag,
  },
  outletPos: { href: "/outlet-sales", label: "Outlet POS", icon: ScanLine },
  expenseItems: {
    href: "/expense-items",
    label: "Expense items",
    icon: Receipt,
  },
  reports: { href: "/reports", label: "Reports", icon: BarChart3 },
};

/** Dashboard first; remaining order is role-specific. */
const SUPER_ADMIN_NAV: NavKey[] = [
  "dashboard",
  "warehouses",
  "outlets",
  "users",
  "rawMaterials",
  "suppliers",
  "rawMaterialPurchases",
  "warehouseProduction",
  "menuCategories",
  "catalogItems",
  "menuItems",
  "warehouseTransfers",
  "outletItems",
  "outletPurchases",
  "outletPos",
  "expenseItems",
  "reports",
];

const WAREHOUSE_USER_NAV: NavKey[] = [
  "dashboard",
  "rawMaterials",
  "rawMaterialPurchases",
  "warehouseProduction",
  "menuItems",
  "warehouseTransfers",
  "reports",
];

const OUTLET_USER_NAV: NavKey[] = [
  "dashboard",
  "outletItems",
  "outletPurchases",
  "outletPos",
  "reports",
];

function navKeysForRole(roleNorm: string): NavKey[] {
  if (roleNorm === "SuperAdmin") return SUPER_ADMIN_NAV;
  if (roleNorm === "WarehouseUser") return WAREHOUSE_USER_NAV;
  if (roleNorm === "OutletUser") return OUTLET_USER_NAV;
  return ["dashboard"];
}

/** Avoid false positives (e.g. `/outlet-items` matching `/outlets`). Same idea as `/reports` vs `/reports/...`. */
function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  /** Single source for sidebar (same normalization as login); avoids mismatch with selectors. */
  const roleNorm = normalizeAuthRole(auth.role);
  const sidebarNav = navKeysForRole(roleNorm).map((key) => NAV_META[key]);
  const handleLogout = (message = "Signed out") => {
    dispatch(apiSlice.util.resetApiState());
    dispatch(logout());
    toast.success(message);
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex h-svh max-h-screen w-56 shrink-0 flex-col border-r border-border bg-white shadow-sm">
        <div className="shrink-0 border-b border-border px-4 py-5">
          <div className="flex items-center gap-3">
            <BrandLogo size={52} className="shadow-sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                MO:MO STEAMERS
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                {auth.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {roleNorm || auth.role || "—"}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-2">
          {sidebarNav.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-border p-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => handleLogout()}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-white px-6 py-4 shadow-sm sm:px-8">
          <h1 className="text-lg font-semibold text-foreground">
            Company dashboard
          </h1>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleLogout()}
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 max-w-full gap-1.5 px-2.5 font-medium"
                  />
                }
              >
                <User className="size-4 shrink-0" />
                <span className="max-w-[120px] truncate sm:max-w-[180px]">
                  {auth.email}
                </span>
                <ChevronDown className="size-3.5 shrink-0 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <div className="px-1.5 pb-2 text-xs text-muted-foreground">
                  <p className="truncate font-medium text-foreground">
                    {auth.email}
                  </p>
                  <p>{auth.role}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleLogout()}
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
