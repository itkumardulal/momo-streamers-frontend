export interface ApiResponse<T> {
  success: boolean;
  message?: string | null;
  data?: T;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  token: string;
  email: string;
  role: string;
  warehouseId?: string | null;
  outletId?: string | null;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateWarehouseRequest {
  name: string;
  location: string;
  isActive: boolean;
}

export interface UpdateWarehouseRequest {
  name: string;
  location: string;
  isActive: boolean;
}

export interface Outlet {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  warehouseId: string;
  warehouseName: string;
}

export interface CreateOutletRequest {
  warehouseId: string;
  name: string;
  location: string;
  isActive: boolean;
}

export interface UpdateOutletRequest {
  warehouseId: string;
  name: string;
  location: string;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  role: string;
  warehouseId?: string | null;
  warehouseName?: string | null;
  outletId?: string | null;
  outletName?: string | null;
  createdAt: string;
  passwordSet?: boolean;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  email: string;
  role: UserRole;
  outletId?: string | null;
  warehouseId?: string | null;
  isActive: boolean;
}

export enum UserRole {
  SuperAdmin = 0,
  OutletUser = 1,
  WarehouseUser = 2,
}

export interface CreateUserRequest {
  email: string;
  /** Omit or leave empty for outlet/warehouse users to send an invitation email instead. */
  password?: string | null;
  role: UserRole;
  warehouseId?: string | null;
  outletId?: string | null;
}

export interface CompletePasswordSetupRequest {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordWithOtpRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface CreateMenuCategoryRequest {
  name: string;
}

export interface UpdateMenuCategoryRequest {
  name: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  menuCategoryId: string;
  categoryName: string;
  onMenu: boolean;
  createdAt: string;
}

export interface CreateCatalogItemRequest {
  name: string;
  menuCategoryId: string;
}

export interface UpdateCatalogItemRequest {
  name: string;
  menuCategoryId: string;
}

export interface RawMaterialItem {
  id: string;
  name: string;
  unit?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface CreateRawMaterialItemRequest {
  name: string;
  unit?: string | null;
  description?: string | null;
}

export interface UpdateRawMaterialItemRequest {
  name: string;
  unit?: string | null;
  description?: string | null;
}

export interface ExpenseItem {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
}

export interface CreateExpenseItemRequest {
  name: string;
  description?: string | null;
}

export interface UpdateExpenseItemRequest {
  name: string;
  description?: string | null;
}

/** Matches backend SupplierPurchaseContext (integer). */
export enum SupplierPurchaseContext {
  Both = 0,
  WarehouseOnly = 1,
  OutletOnly = 2,
}

export interface Supplier {
  id: string;
  name: string;
  purchaseContext: SupplierPurchaseContext;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  purchaseContext?: SupplierPurchaseContext;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierRequest {
  name: string;
  purchaseContext?: SupplierPurchaseContext;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface OutletItem {
  id: string;
  name: string;
  unit?: string | null;
  description?: string | null;
  defaultSellPrice: number;
  createdAt: string;
}

export interface CreateOutletItemRequest {
  name: string;
  unit?: string | null;
  description?: string | null;
  defaultSellPrice: number;
}

export interface UpdateOutletItemRequest {
  name: string;
  unit?: string | null;
  description?: string | null;
  defaultSellPrice: number;
}

export interface OutletItemPurchaseLineInput {
  outletItemId: string;
  supplierId: string;
  quantity: number;
  ratePerUnit: number;
}

export interface CreateOutletItemPurchaseRequest {
  outletId?: string | null;
  purchaseDate: string;
  notes?: string | null;
  lines: OutletItemPurchaseLineInput[];
}

export interface OutletItemPurchaseLine {
  id: string;
  outletItemId: string;
  outletItemName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  ratePerUnit: number;
  lineTotal: number;
}

export interface OutletItemPurchaseListItem {
  id: string;
  receiptNo: string;
  outletId: string;
  outletName: string;
  purchaseDate: string;
  createdAt: string;
  lineCount: number;
  grandTotal: number;
}

export interface OutletItemPurchaseDetail {
  id: string;
  receiptNo: string;
  outletId: string;
  outletName: string;
  purchaseDate: string;
  notes?: string | null;
  createdAt: string;
  lines: OutletItemPurchaseLine[];
}

/** Matches backend OutletStockSource. */
export enum OutletStockSource {
  Warehouse = 1,
  Direct = 2,
}

export interface OutletSellableStockRow {
  source: OutletStockSource;
  menuItemId?: string | null;
  outletItemId?: string | null;
  displayName: string;
  sellPrice: number;
  quantityOnHand: number;
}

export interface CreateOutletSaleMenuLine {
  menuItemId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOutletSaleDirectLine {
  outletItemId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOutletSaleRequest {
  outletId?: string | null;
  saleAtUtc?: string | null;
  notes?: string | null;
  /** Optional delivery/service etc.; omitted means zero. */
  otherChargeAmount?: number | null;
  menuLines: CreateOutletSaleMenuLine[];
  directLines: CreateOutletSaleDirectLine[];
}

export interface OutletSaleMenuLine {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OutletSaleDirectLine {
  id: string;
  outletItemId: string;
  outletItemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OutletSaleListItem {
  id: string;
  receiptNo: string;
  outletId: string;
  outletName: string;
  saleAtUtc: string;
  otherChargeAmount: number;
  grandTotal: number;
  createdAt: string;
}

export interface OutletSaleDetail {
  id: string;
  receiptNo: string;
  outletId: string;
  outletName: string;
  saleAtUtc: string;
  notes?: string | null;
  otherChargeAmount: number;
  grandTotal: number;
  createdAt: string;
  menuLines: OutletSaleMenuLine[];
  directLines: OutletSaleDirectLine[];
}

export interface MenuItem {
  id: string;
  catalogItemId: string;
  name: string;
  menuCategoryId: string;
  categoryName: string;
  warehouseId: string;
  warehouseName: string;
  costPerUnit: number;
  sellPricePerUnit: number;
  openingStockDay1: number;
  /** Live warehouse on-hand (from stock table). */
  quantityOnHand: number;
  notes?: string | null;
  createdAt: string;
}

export interface CreateMenuItemRequest {
  catalogItemId: string;
  /** Super admin: required. Warehouse/outlet users: optional (server uses their warehouse). */
  warehouseId?: string | null;
  costPerUnit: number;
  sellPricePerUnit: number;
  openingStockDay1: number;
  notes?: string | null;
}

export interface UpdateMenuItemRequest {
  catalogItemId: string;
  warehouseId: string;
  costPerUnit: number;
  sellPricePerUnit: number;
  openingStockDay1: number;
  notes?: string | null;
}

export interface WarehouseTransferLineInput {
  menuItemId: string;
  quantity: number;
}

export interface CreateWarehouseTransferRequest {
  warehouseId?: string | null;
  outletId: string;
  notes?: string | null;
  lines: WarehouseTransferLineInput[];
}

export interface WarehouseTransferLine {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
}

export interface WarehouseTransferListItem {
  id: string;
  receiptNo: string;
  warehouseId: string;
  warehouseName: string;
  outletId: string;
  outletName: string;
  createdAt: string;
  lineCount: number;
  totalQuantity: number;
}

export interface WarehouseTransferDetail {
  id: string;
  receiptNo: string;
  warehouseId: string;
  warehouseName: string;
  outletId: string;
  outletName: string;
  notes?: string | null;
  createdAt: string;
  lines: WarehouseTransferLine[];
}

export interface WarehouseProductionLineInput {
  menuItemId: string;
  quantity: number;
  damageQuantity: number;
}

export interface CreateWarehouseProductionRequest {
  warehouseId?: string | null;
  notes?: string | null;
  lines: WarehouseProductionLineInput[];
}

export interface WarehouseProductionLine {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  damageQuantity: number;
}

export interface WarehouseProductionListItem {
  id: string;
  receiptNo: string;
  warehouseId: string;
  warehouseName: string;
  createdAt: string;
  lineCount: number;
  totalQuantity: number;
  totalDamageQuantity: number;
}

export interface WarehouseProductionDetail {
  id: string;
  receiptNo: string;
  warehouseId: string;
  warehouseName: string;
  notes?: string | null;
  createdAt: string;
  lines: WarehouseProductionLine[];
}

export interface RawMaterialPurchaseLineInput {
  rawMaterialItemId: string;
  supplierId: string;
  quantity: number;
  ratePerUnit: number;
}

export interface CreateRawMaterialPurchaseRequest {
  warehouseId?: string | null;
  /** ISO date string (yyyy-MM-dd). */
  purchaseDate: string;
  notes?: string | null;
  lines: RawMaterialPurchaseLineInput[];
}

export interface RawMaterialPurchaseLine {
  id: string;
  rawMaterialItemId: string;
  rawMaterialItemName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  ratePerUnit: number;
  lineTotal: number;
}

export interface RawMaterialPurchaseListItem {
  id: string;
  receiptNo: string;
  warehouseId: string;
  warehouseName: string;
  /** ISO date string (yyyy-MM-dd). */
  purchaseDate: string;
  createdAt: string;
  lineCount: number;
  grandTotal: number;
}

export interface RawMaterialPurchaseDetail {
  id: string;
  receiptNo: string;
  warehouseId: string;
  warehouseName: string;
  purchaseDate: string;
  notes?: string | null;
  createdAt: string;
  lines: RawMaterialPurchaseLine[];
}

export interface WarehouseDailyStockReportOutletColumn {
  id: string;
  name: string;
}

export interface WarehouseDailyStockReportRow {
  menuItemId: string;
  itemName: string;
  openingStock: number;
  productionAdded: number;
  transferQuantities: number[];
  damage: number;
  closingStock: number;
}

export interface WarehouseDailyStockReportDay {
  /** ISO date (yyyy-MM-dd). */
  date: string;
  rows: WarehouseDailyStockReportRow[];
}

export interface WarehouseDailyStockReport {
  warehouseId: string;
  warehouseName: string;
  fromDate: string;
  toDate: string;
  outletColumns: WarehouseDailyStockReportOutletColumn[];
  days: WarehouseDailyStockReportDay[];
}
