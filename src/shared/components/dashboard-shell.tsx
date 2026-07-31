"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
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
  Wrench,
  Archive,
  FolderTree,
  PanelLeftClose,
  PanelLeftOpen,
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

const SIDEBAR_COLLAPSED_KEY = "momo-sidebar-collapsed";

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
  | "assetCategories"
  | "assets"
  | "maintenanceRecords"
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
  assetCategories: {
    href: "/asset-categories",
    label: "Asset categories",
    icon: FolderTree,
  },
  assets: { href: "/assets", label: "Assets", icon: Archive },
  maintenanceRecords: {
    href: "/maintenance-records",
    label: "Maintenance records",
    icon: Wrench,
  },
  reports: { href: "/reports", label: "Reports", icon: BarChart3 },
};

type NavSection = {
  id: string;
  label: string;
  keys: NavKey[];
  icon: LucideIcon;
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: "organization",
    label: "Organization",
    icon: Building2,
    keys: ["warehouses", "outlets", "users"],
  },
  {
    id: "menu",
    label: "Menu",
    icon: UtensilsCrossed,
    keys: ["menuCategories", "catalogItems", "menuItems"],
  },
  {
    id: "warehouse",
    label: "Warehouse",
    icon: Boxes,
    keys: [
      "rawMaterials",
      "suppliers",
      "rawMaterialPurchases",
      "warehouseProduction",
      "warehouseTransfers",
    ],
  },
  {
    id: "outletPos",
    label: "Outlet & POS",
    icon: ScanLine,
    keys: [
      "outletItems",
      "outletPurchases",
      "outletPos",
      "outletStockRemovals",
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Wallet,
    keys: ["expenseItems", "expenseEntries"],
  },
  {
    id: "assets",
    label: "Assets",
    icon: Archive,
    keys: ["assetCategories", "assets", "maintenanceRecords"],
  },
];

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
  {
    prefix: "/reports/assets-report",
    title: "Assets report",
  },
  {
    prefix: "/reports/asset-maintenance-report",
    title: "Asset maintenance report",
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

/** Dashboard first; remaining order is role-specific. Assets: SuperAdmin only. */
const SUPER_ADMIN_NAV: NavKey[] = [
  "dashboard",
  "warehouses",
  "users",
  "rawMaterials",
  "suppliers",
  "rawMaterialPurchases",
  "menuCategories",
  "catalogItems",
  "menuItems",
  "warehouseProduction",
  "warehouseTransfers",
  "expenseItems",
  "expenseEntries",
  "assetCategories",
  "assets",
  "maintenanceRecords",
  "outlets",
  "outletItems",
  "outletPurchases",
  "outletPos",
  "outletStockRemovals",
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

type NavTreeNode =
  | { kind: "link"; item: NavItem }
  | {
      kind: "section";
      id: string;
      label: string;
      icon: LucideIcon;
      items: NavItem[];
    };

function buildNavTree(allowedKeys: NavKey[], roleNorm: string): NavTreeNode[] {
  const allowed = new Set(allowedKeys);
  const resolveItem = (key: NavKey): NavItem => {
    const meta = NAV_META[key];
    if (key === "outletPos" && roleNorm === "WarehouseUser") {
      return { ...meta, label: "Warehouse POS" };
    }
    return meta;
  };

  const nodes: NavTreeNode[] = [];

  if (allowed.has("dashboard")) {
    nodes.push({ kind: "link", item: resolveItem("dashboard") });
  }

  for (const section of NAV_SECTIONS) {
    const keys = section.keys.filter((k) => allowed.has(k));
    if (keys.length === 0) continue;
    nodes.push({
      kind: "section",
      id: section.id,
      label: section.label,
      icon: section.icon,
      items: keys.map(resolveItem),
    });
  }

  if (allowed.has("reports")) {
    nodes.push({ kind: "link", item: resolveItem("reports") });
  }

  return nodes;
}

function navLinkClass(active: boolean, collapsed: boolean) {
  return cn(
    "flex items-center rounded-lg text-sm font-medium transition-colors",
    collapsed
      ? "justify-center px-2 py-2"
      : "gap-2 px-3 py-2",
    active
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
}

function CollapsedSectionFlyout({
  label,
  icon: SectionIcon,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionActive = items.some((item) =>
    isNavItemActive(pathname, item.href),
  );

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const updateCoords = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ top: rect.top, left: rect.right + 6 });
  };

  const openMenu = () => {
    clearCloseTimer();
    updateCoords();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => () => clearCloseTimer(), []);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateCoords();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  return (
    <div onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        ref={triggerRef}
        type="button"
        title={label}
        aria-label={label}
        aria-expanded={open}
        className={cn(navLinkClass(sectionActive, true), "w-full")}
        onFocus={openMenu}
        onBlur={scheduleClose}
      >
        <SectionIcon className="size-4 shrink-0" />
      </button>
      {open && (
        <div
          className="fixed z-50 min-w-52 rounded-xl border border-border bg-white p-2 shadow-lg ring-1 ring-black/5"
          style={{ top: coords.top, left: coords.left }}
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
          role="menu"
        >
          <p className="px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <div className="flex flex-col gap-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => onNavigate?.()}
                  className={navLinkClass(active, false)}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarNavTree({
  tree,
  pathname,
  onNavigate,
  collapsed = false,
  className,
}: {
  tree: NavTreeNode[];
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  className?: string;
}) {
  const activeSectionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of tree) {
      if (node.kind !== "section") continue;
      if (node.items.some((item) => isNavItemActive(pathname, item.href))) {
        ids.add(node.id);
      }
    }
    return ids;
  }, [tree, pathname]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const id of activeSectionIds) initial[id] = true;
      return initial;
    },
  );

  useEffect(() => {
    if (activeSectionIds.size === 0) return;
    setOpenSections((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of activeSectionIds) {
        if (!next[id]) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [activeSectionIds]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (collapsed) {
    return (
      <nav
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain overflow-x-visible p-2",
          className,
        )}
      >
        {tree.map((node) => {
          if (node.kind === "link") {
            const Icon = node.item.icon;
            const active = isNavItemActive(pathname, node.item.href);
            return (
              <Link
                key={node.item.href}
                href={node.item.href}
                title={node.item.label}
                aria-label={node.item.label}
                onClick={() => onNavigate?.()}
                className={navLinkClass(active, true)}
              >
                <Icon className="size-4 shrink-0" />
              </Link>
            );
          }

          return (
            <CollapsedSectionFlyout
              key={node.id}
              label={node.label}
              icon={node.icon}
              items={node.items}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-2",
        className,
      )}
    >
      {tree.map((node, index) => {
        if (node.kind === "link") {
          const Icon = node.item.icon;
          const active = isNavItemActive(pathname, node.item.href);
          return (
            <Link
              key={node.item.href}
              href={node.item.href}
              onClick={() => onNavigate?.()}
              className={navLinkClass(active, false)}
            >
              <Icon className="size-4 shrink-0" />
              {node.item.label}
            </Link>
          );
        }

        const open = !!openSections[node.id];
        const showDivider = index > 0;

        return (
          <div
            key={node.id}
            className={cn(showDivider && "mt-1 border-t border-border pt-1")}
          >
            <button
              type="button"
              onClick={() => toggleSection(node.id)}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-expanded={open}
            >
              <span>{node.label}</span>
              {open ? (
                <ChevronDown className="size-3.5 shrink-0 opacity-70" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0 opacity-70" />
              )}
            </button>
            {open && (
              <div className="mt-0.5 flex flex-col gap-0.5 pl-2">
                {node.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavItemActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onNavigate?.()}
                      className={navLinkClass(active, false)}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarChrome({
  authEmail,
  roleLine,
  collapsed = false,
  onToggleCollapse,
  children,
}: {
  authEmail: string;
  roleLine: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className={cn(
          "shrink-0 border-b border-border",
          collapsed ? "px-2 py-3" : "px-4 py-5",
        )}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <BrandLogo size={36} className="shadow-sm" />
            {onToggleCollapse && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Expand sidebar"
                title="Expand sidebar"
                onClick={onToggleCollapse}
              >
                <PanelLeftOpen className="size-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
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
            {onToggleCollapse && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Minimize sidebar"
                title="Minimize sidebar"
                onClick={onToggleCollapse}
              >
                <PanelLeftClose className="size-4" />
              </Button>
            )}
          </div>
        )}
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
  const [collapsed, setCollapsed] = useState(false);

  const roleNorm = normalizeAuthRole(auth.role);
  const sidebarTree = useMemo(
    () => buildNavTree(navKeysForRole(roleNorm), roleNorm),
    [roleNorm],
  );
  const roleLine = roleNorm || auth.role || "—";
  const authEmail = auth.email ?? "";
  const pageTitle = headerTitleForPath(pathname, roleNorm);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleLogout = (message = "Signed out") => {
    dispatch(apiSlice.util.resetApiState());
    dispatch(logout());
    toast.success(message);
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={cn(
          "hidden h-svh max-h-screen shrink-0 flex-col overflow-visible border-r border-border bg-white shadow-sm transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarChrome
          authEmail={authEmail}
          roleLine={roleLine}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        >
          <SidebarNavTree
            tree={sidebarTree}
            pathname={pathname}
            collapsed={collapsed}
          />
        </SidebarChrome>
        <div className="shrink-0 border-t border-border p-2">
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full gap-2",
              collapsed ? "justify-center px-0" : "justify-start",
            )}
            title="Sign out"
            aria-label="Sign out"
            onClick={() => handleLogout()}
          >
            <LogOut className="size-4" />
            {!collapsed && "Sign out"}
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
                  <SidebarNavTree
                    tree={sidebarTree}
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
