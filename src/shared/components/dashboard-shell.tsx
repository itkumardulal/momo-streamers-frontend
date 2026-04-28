"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
  Menu,
  Package,
  Receipt,
  ShoppingCart,
  Tags,
  Truck,
  UtensilsCrossed,
  User,
  Users,
  Wallet,
  Store,
  ShoppingBag,
  ScanLine,
  PackageMinus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  | "outletStockRemovals"
  | "expenseItems"
  | "expenseEntries"
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
  outletStockRemovals: {
    href: "/outlet-stock-removals",
    label: "Stock removals",
    icon: PackageMinus,
  },
  expenseItems: {
    href: "/expense-items",
    label: "Expense items",
    icon: Receipt,
  },
  expenseEntries: {
    href: "/expense-entries",
    label: "Daily expenses",
    icon: Wallet,
  },
  reports: { href: "/reports", label: "Reports", icon: BarChart3 },
};

/** Longer paths first so nested routes win over `/reports`. */
const HEADER_TITLE_PREFIXES: { prefix: string; title: string }[] = [
  {
    prefix: "/reports/warehouse-stock-report",
    title: "Warehouse daily stock",
  },
  {
    prefix: "/reports/outlet-daily-stock-report",
    title: "Outlet daily stock",
  },
  {
    prefix: "/reports/outlet-performance",
    title: "Outlet performance comparison",
  },
  {
    prefix: "/reports/outlet-daily-sheet",
    title: "Outlet daily sheet",
  },
  {
    prefix: "/reports/monthly-business-sheet",
    title: "Monthly business sheet",
  },
  ...Object.values(NAV_META).map(({ href, label }) => ({
    prefix: href,
    title: label,
  })),
].sort((a, b) => b.prefix.length - a.prefix.length);

function headerTitleForPath(pathname: string, roleNorm?: string): string {
  if (
    (pathname === "/outlet-sales" || pathname.startsWith("/outlet-sales/")) &&
    roleNorm === "WarehouseUser"
  ) {
    return "Warehouse POS";
  }
  for (const { prefix, title } of HEADER_TITLE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return title;
    }
  }
  return "Dashboard";
}

/** Dashboard first; remaining order is role-specific. */
const SUPER_ADMIN_NAV: NavKey[] = [
  "dashboard",
  "warehouses",
  "outlets",
  "users",
  "rawMaterials",
  "suppliers",
  "rawMaterialPurchases",
  "menuCategories",
  "catalogItems",
  "menuItems",
  "warehouseProduction",
  "warehouseTransfers",
  "outletItems",
  "outletPurchases",
  "outletPos",
  "outletStockRemovals",
  "expenseItems",
  "expenseEntries",
  "reports",
];

const WAREHOUSE_USER_NAV: NavKey[] = [
  "dashboard",
  "rawMaterials",
  "rawMaterialPurchases",
  "menuItems",
  "warehouseProduction",
  "warehouseTransfers",
  "outletPos",
  "outletStockRemovals",
  "reports",
];

const OUTLET_USER_NAV: NavKey[] = [
  "dashboard",
  "outletItems",
  "outletPurchases",
  "outletPos",
  "outletStockRemovals",
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

type NavItem = { href: string; label: string; icon: LucideIcon };

function SidebarNavLinks({
  items,
  pathname,
  onNavigate,
  className,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-2",
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = isNavItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onNavigate?.()}
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
  );
}

function SidebarChrome({
  authEmail,
  roleLine,
  children,
}: {
  authEmail: string;
  roleLine: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="shrink-0 border-b border-border px-4 py-5">
        <div className="flex items-center gap-3">
          <BrandLogo size={52} className="shadow-sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              MO:MO STEAMERS
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-foreground">
              {authEmail}
            </p>
            <p className="text-xs text-muted-foreground">{roleLine}</p>
          </div>
        </div>
      </div>
      {children}
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const roleNorm = normalizeAuthRole(auth.role);
  const sidebarNav = useMemo(
    () =>
      navKeysForRole(roleNorm).map((key) => {
        const meta = NAV_META[key];
        if (key === "outletPos" && roleNorm === "WarehouseUser") {
          return { ...meta, label: "Warehouse POS" };
        }
        return meta;
      }),
    [roleNorm],
  );
  const roleLine = roleNorm || auth.role || "—";
  const authEmail = auth.email ?? "";
  const pageTitle = headerTitleForPath(pathname, roleNorm);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const handleLogout = (message = "Signed out") => {
    dispatch(apiSlice.util.resetApiState());
    dispatch(logout());
    toast.success(message);
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden h-svh max-h-screen w-56 shrink-0 flex-col border-r border-border bg-white shadow-sm lg:flex">
        <SidebarChrome authEmail={authEmail} roleLine={roleLine}>
          <SidebarNavLinks items={sidebarNav} pathname={pathname} />
        </SidebarChrome>
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
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-4 py-3 shadow-sm sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0 lg:hidden"
                aria-label="Open menu"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="size-4" />
              </Button>
              <DialogContent
                showCloseButton
                className={cn(
                  "fixed top-0 left-0 z-50 flex h-dvh max-h-[100dvh] w-[min(100%,18rem)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-popover p-0 shadow-lg ring-1 ring-foreground/10 outline-none",
                  "data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-left-4",
                  "data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-left-4",
                )}
              >
                <SidebarChrome authEmail={authEmail} roleLine={roleLine}>
                  <SidebarNavLinks
                    items={sidebarNav}
                    pathname={pathname}
                    onNavigate={() => setMobileNavOpen(false)}
                  />
                </SidebarChrome>
                <div className="shrink-0 border-t border-border p-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setMobileNavOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex min-w-0 items-center gap-2 lg:hidden">
              <BrandLogo size={36} className="shadow-sm" />
            </div>
            <h1 className="min-w-0 truncate text-base font-semibold text-foreground sm:text-lg">
              {pageTitle}
            </h1>
          </div>
          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => handleLogout()}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
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
                <span className="max-w-[100px] truncate sm:max-w-[180px]">
                  {authEmail}
                </span>
                <ChevronDown className="size-3.5 shrink-0 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <div className="px-1.5 pb-2 text-xs text-muted-foreground">
                  <p className="truncate font-medium text-foreground">
                    {authEmail}
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
