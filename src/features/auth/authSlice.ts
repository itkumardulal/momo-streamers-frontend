import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const STORAGE_KEY = "momo_streamer_auth";

export type AuthState = {
  userId: string | null;
  token: string | null;
  email: string | null;
  role: string | null;
  warehouseId: string | null;
  outletId: string | null;
  rehydrated: boolean;
};

const empty: AuthState = {
  userId: null,
  token: null,
  email: null,
  role: null,
  warehouseId: null,
  outletId: null,
  rehydrated: false,
};

function readStorage(): Omit<AuthState, "rehydrated"> {
  if (typeof window === "undefined") {
    return {
      userId: null,
      token: null,
      email: null,
      role: null,
      warehouseId: null,
      outletId: null,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        userId: null,
        token: null,
        email: null,
        role: null,
        warehouseId: null,
        outletId: null,
      };
    }
    const p = JSON.parse(raw) as Record<string, unknown>;
    const roleFromStorage =
      typeof p.role === "string"
        ? p.role
        : typeof p.role === "number"
          ? String(p.role)
          : null;
    return {
      userId: typeof p.userId === "string" ? p.userId : null,
      token: typeof p.token === "string" ? p.token : null,
      email: typeof p.email === "string" ? p.email : null,
      role: roleFromStorage,
      warehouseId: typeof p.warehouseId === "string" ? p.warehouseId : null,
      outletId: typeof p.outletId === "string" ? p.outletId : null,
    };
  } catch {
    return {
      userId: null,
      token: null,
      email: null,
      role: null,
      warehouseId: null,
      outletId: null,
    };
  }
}

function writeStorage(state: Omit<AuthState, "rehydrated">) {
  if (typeof window === "undefined") return;
  if (!state.token) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      userId: state.userId,
      token: state.token,
      email: state.email,
      role: state.role,
      warehouseId: state.warehouseId,
      outletId: state.outletId,
    }),
  );
}

const authSlice = createSlice({
  name: "auth",
  initialState: empty,
  reducers: {
    rehydrate(state) {
      const s = readStorage();
      state.userId = s.userId;
      state.token = s.token;
      state.email = s.email;
      state.role = normalizeAuthRole(s.role) || s.role;
      state.warehouseId = s.warehouseId;
      state.outletId = s.outletId;
      state.rehydrated = true;
    },
    setCredentials(
      state,
      action: PayloadAction<{
        userId?: string | null;
        token: string;
        email: string;
        role: string;
        warehouseId?: string | null;
        outletId?: string | null;
      }>,
    ) {
      if (action.payload.userId !== undefined && action.payload.userId !== null) {
        state.userId = action.payload.userId;
      }
      state.token = action.payload.token;
      state.email = action.payload.email;
      state.role =
        normalizeAuthRole(action.payload.role) || action.payload.role;
      state.warehouseId = action.payload.warehouseId ?? null;
      state.outletId = action.payload.outletId ?? null;
      writeStorage({
        userId: state.userId,
        token: state.token,
        email: state.email,
        role: state.role,
        warehouseId: state.warehouseId,
        outletId: state.outletId,
      });
    },
    logout(state) {
      state.userId = null;
      state.token = null;
      state.email = null;
      state.role = null;
      state.warehouseId = null;
      state.outletId = null;
      writeStorage({
        userId: null,
        token: null,
        email: null,
        role: null,
        warehouseId: null,
        outletId: null,
      });
    },
  },
});

export const { rehydrate, setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

export const selectAuth = (s: { auth: AuthState }) => s.auth;

/** Strip ZWSP/BOM/soft hyphen so UI role text and selector checks stay aligned. */
function stripInvisibleRoleNoise(s: string): string {
  return s
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D\u2060\u00AD]/g, "")
    .trim();
}

/** Normalizes role from login / localStorage (whitespace, legacy values, noisy Unicode). */
export function normalizeAuthRole(role: string | null | undefined): string {
  const r = stripInvisibleRoleNoise(role ?? "");
  if (!r) return "";
  const lower = r.toLowerCase();
  const compact = lower.replace(/\s+/g, "");
  if (compact === "superadmin" || r === "0") return "SuperAdmin";
  if (compact === "warehouseuser" || r === "2") return "WarehouseUser";
  if (compact === "outletuser" || r === "1") return "OutletUser";
  if (r === "SuperAdmin" || r === "WarehouseUser" || r === "OutletUser") return r;
  return r;
}

export const selectIsSuperAdmin = (s: { auth: AuthState }) =>
  normalizeAuthRole(s.auth.role) === "SuperAdmin";

/** Daily expense log (API: SuperAdmin only). */
export const selectCanManageDailyExpenses = (s: { auth: AuthState }) =>
  selectIsSuperAdmin(s);

export const selectIsWarehouseUser = (s: { auth: AuthState }) =>
  normalizeAuthRole(s.auth.role) === "WarehouseUser";

export const selectIsOutletUser = (s: { auth: AuthState }) =>
  normalizeAuthRole(s.auth.role) === "OutletUser";

export const selectAuthOutletId = (s: { auth: AuthState }) => s.auth.outletId;

export const selectAuthWarehouseId = (s: { auth: AuthState }) => s.auth.warehouseId;

/** Super admin or warehouse manager — can manage outlets in their warehouse (see API rules). */
export const selectCanManageOutlets = (s: { auth: AuthState }) =>
  selectIsSuperAdmin(s) || selectIsWarehouseUser(s);

/** Can post warehouse transfers / production (API: SuperAdmin or WarehouseUser). */
export const selectCanPostWarehouseInventory = (s: { auth: AuthState }) =>
  selectIsSuperAdmin(s) || selectIsWarehouseUser(s);

/** Monthly business sheet report (API: SuperAdmin or WarehouseUser). */
export const selectCanViewMonthlyBusinessSheet = (s: { auth: AuthState }) =>
  selectIsSuperAdmin(s) || selectIsWarehouseUser(s);

/** Outlet purchases UI (API: SuperAdmin or OutletUser). */
export const selectCanUseOutletPurchasePage = (s: { auth: AuthState }) =>
  selectIsSuperAdmin(s) || selectIsOutletUser(s);

/** POS / outlet sales (API: SuperAdmin or OutletUser). */
export const selectCanUseOutletPos = (s: { auth: AuthState }) =>
  selectIsSuperAdmin(s) || selectIsOutletUser(s);

/** View outlet stock removals list/detail (API: SuperAdmin, OutletUser, or WarehouseUser). */
export const selectCanViewOutletStockRemovals = (s: { auth: AuthState }) =>
  selectIsSuperAdmin(s) || selectIsOutletUser(s) || selectIsWarehouseUser(s);

/** Manage outlet retail catalog (API: SuperAdmin or WarehouseUser). */
export const selectCanManageOutletItems = (s: { auth: AuthState }) =>
  selectIsSuperAdmin(s) || selectIsWarehouseUser(s);

/** Read outlet item catalog for pickers / reference (API allows OutletUser list). */
export const selectCanViewOutletItemsCatalog = (s: { auth: AuthState }) =>
  selectCanManageOutletItems(s) || selectIsOutletUser(s);
