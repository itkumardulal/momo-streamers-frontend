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

/** Matches backend MonthlySheetExpenseCategory (integer). */
export enum MonthlySheetExpenseCategory {
  None = 0,
  Rent = 1,
  Staff1Salary = 2,
  Staff2Salary = 3,
  Staff3Salary = 4,
  Internet = 5,
  Electricity = 6,
  Water = 7,
  TransportationDelivery = 8,
  MarketingPromotion = 9,
  RawMaterialsIngredients = 10,
  Packaging = 11,
  LpgCookingGas = 12,
  MaintenanceRepairs = 13,
  CleaningSupplies = 14,
  PosSoftwareWalletCharges = 15,
  LicensesTaxesMunicipalityFees = 16,
  SecurityCctv = 17,
  StaffMealsTea = 18,
  FestivalBonusOvertime = 19,
  BankCharges = 20,
  Miscellaneous = 21,
}

export const MONTHLY_SHEET_CATEGORY_OPTIONS: {
  value: MonthlySheetExpenseCategory;
  label: string;
}[] = [
  { value: MonthlySheetExpenseCategory.None, label: "Not on monthly sheet" },
  { value: MonthlySheetExpenseCategory.Rent, label: "Rent" },
  { value: MonthlySheetExpenseCategory.Staff1Salary, label: "Staff 1 salary" },
  { value: MonthlySheetExpenseCategory.Staff2Salary, label: "Staff 2 salary" },
  { value: MonthlySheetExpenseCategory.Staff3Salary, label: "Staff 3 salary" },
  { value: MonthlySheetExpenseCategory.Internet, label: "Internet" },
  { value: MonthlySheetExpenseCategory.Electricity, label: "Electricity" },
  { value: MonthlySheetExpenseCategory.Water, label: "Water" },
  {
    value: MonthlySheetExpenseCategory.TransportationDelivery,
    label: "Transportation / delivery",
  },
  {
    value: MonthlySheetExpenseCategory.MarketingPromotion,
    label: "Marketing / promotion",
  },
  {
    value: MonthlySheetExpenseCategory.RawMaterialsIngredients,
    label: "Raw materials / ingredients",
  },
  { value: MonthlySheetExpenseCategory.Packaging, label: "Packaging" },
  { value: MonthlySheetExpenseCategory.LpgCookingGas, label: "LPG / cooking gas" },
  {
    value: MonthlySheetExpenseCategory.MaintenanceRepairs,
    label: "Maintenance / repairs",
  },
  {
    value: MonthlySheetExpenseCategory.CleaningSupplies,
    label: "Cleaning supplies",
  },
  {
    value: MonthlySheetExpenseCategory.PosSoftwareWalletCharges,
    label: "POS / software / wallet charges",
  },
  {
    value: MonthlySheetExpenseCategory.LicensesTaxesMunicipalityFees,
    label: "Licenses / taxes / municipality fees",
  },
  { value: MonthlySheetExpenseCategory.SecurityCctv, label: "Security / CCTV" },
  { value: MonthlySheetExpenseCategory.StaffMealsTea, label: "Staff meals / tea" },
  {
    value: MonthlySheetExpenseCategory.FestivalBonusOvertime,
    label: "Festival bonus / overtime",
  },
  { value: MonthlySheetExpenseCategory.BankCharges, label: "Bank charges" },
  { value: MonthlySheetExpenseCategory.Miscellaneous, label: "Miscellaneous" },
];

export interface ExpenseItem {
  id: string;
  name: string;
  description?: string | null;
  monthlySheetExpenseCategory: MonthlySheetExpenseCategory;
  createdAt: string;
}

export interface CreateExpenseItemRequest {
  name: string;
  description?: string | null;
  monthlySheetExpenseCategory?: MonthlySheetExpenseCategory;
}

export interface UpdateExpenseItemRequest {
  name: string;
  description?: string | null;
  monthlySheetExpenseCategory?: MonthlySheetExpenseCategory;
}

/** Backend DateOnly serializes as yyyy-MM-dd. */
export interface ExpenseEntry {
  id: string;
  expenseItemId: string;
  expenseItemName: string;
  amount: number;
  expenseDate: string;
  outletId?: string | null;
  outletName?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateExpenseEntryRequest {
  expenseItemId: string;
  amount: number;
  expenseDate: string;
  outletId?: string | null;
  warehouseId?: string | null;
  notes?: string | null;
}

export interface UpdateExpenseEntryRequest {
  expenseItemId: string;
  amount: number;
  expenseDate: string;
  outletId?: string | null;
  warehouseId?: string | null;
  notes?: string | null;
}

/** Matches backend AssetStatus (integer). */
export enum AssetStatus {
  Active = 0,
  Inactive = 1,
  Disposed = 2,
}

export const ASSET_STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: AssetStatus.Active, label: "Active" },
  { value: AssetStatus.Inactive, label: "Inactive" },
  { value: AssetStatus.Disposed, label: "Disposed" },
];

export interface AssetCategory {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
}

export interface CreateAssetCategoryRequest {
  name: string;
  description?: string | null;
}

export interface UpdateAssetCategoryRequest {
  name: string;
  description?: string | null;
}

export interface Asset {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  purchaseDate: string;
  purchaseCost: number;
  warrantyExpiry?: string | null;
  status: AssetStatus;
  remarks?: string | null;
  outletId?: string | null;
  outletName?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  createdAt: string;
}

export interface CreateAssetRequest {
  categoryId: string;
  name: string;
  purchaseDate: string;
  purchaseCost: number;
  warrantyExpiry?: string | null;
  status?: AssetStatus;
  remarks?: string | null;
  outletId?: string | null;
  warehouseId?: string | null;
}

export interface UpdateAssetRequest {
  categoryId: string;
  name: string;
  purchaseDate: string;
  purchaseCost: number;
  warrantyExpiry?: string | null;
  status: AssetStatus;
  remarks?: string | null;
  outletId?: string | null;
  warehouseId?: string | null;
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  assetName: string;
  maintenanceDate: string;
  cost: number;
  recordAsExpense: boolean;
  expenseEntryId?: string | null;
  expenseItemId?: string | null;
  expenseItemName?: string | null;
  outletId?: string | null;
  outletName?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  description?: string | null;
  remarks?: string | null;
  createdAt: string;
}

export interface CreateAssetMaintenanceRequest {
  assetId: string;
  maintenanceDate: string;
  cost: number;
  recordAsExpense: boolean;
  expenseItemId?: string | null;
  outletId?: string | null;
  warehouseId?: string | null;
  description?: string | null;
  remarks?: string | null;
}

export interface UpdateAssetMaintenanceRequest {
  assetId: string;
  maintenanceDate: string;
  cost: number;
  recordAsExpense: boolean;
  expenseItemId?: string | null;
  outletId?: string | null;
  warehouseId?: string | null;
  description?: string | null;
  remarks?: string | null;
}

export interface AssetReportRow {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  status: AssetStatus;
  purchaseDate: string;
  purchaseCost: number;
  warrantyExpiry?: string | null;
  outletId?: string | null;
  outletName?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
  remarks?: string | null;
}

export interface AssetReport {
  categoryId?: string | null;
  status?: AssetStatus | null;
  outletId?: string | null;
  warehouseId?: string | null;
  totalCount: number;
  totalPurchaseCost: number;
  rows: AssetReportRow[];
}

export interface AssetMaintenanceReportRow {
  id: string;
  maintenanceDate: string;
  assetId: string;
  assetName: string;
  categoryId: string;
  categoryName: string;
  cost: number;
  description?: string | null;
  remarks?: string | null;
  recordAsExpense: boolean;
  expenseItemName?: string | null;
  outletId?: string | null;
  outletName?: string | null;
  warehouseId?: string | null;
  warehouseName?: string | null;
}

export interface AssetMaintenanceReport {
  fromDate: string;
  toDate: string;
  assetId?: string | null;
  categoryId?: string | null;
  totalCount: number;
  totalCost: number;
  expenseCount: number;
  expenseCostTotal: number;
  rows: AssetMaintenanceReportRow[];
}

export interface MonthlyBusinessSheetOutletDto {
  id: string;
  name: string;
}

export interface MonthlyBusinessSheetWarehouseRevenueDto {
  sales: number;
  otherIncome: number;
  totalRevenue: number;
}

export interface MonthlyBusinessSheetExpenseItemRowDto {
  expenseItemId: string;
  label: string;
  outletAmounts: number[];
  warehouseAmount: number;
  rowTotal: number;
}

export interface MonthlyBusinessSheet {
  year: number;
  month: number;
  warehouseId: string;
  warehouseName: string;
  outlets: MonthlyBusinessSheetOutletDto[];
  outletSales: number[];
  outletOtherIncome: number[];
  outletTotalRevenue: number[];
  warehouseRevenue: MonthlyBusinessSheetWarehouseRevenueDto;
  totalSales: number;
  totalOtherIncome: number;
  totalRevenue: number;
  expenseRows: MonthlyBusinessSheetExpenseItemRowDto[];
  outletTotalExpenses: number[];
  warehouseTotalExpenses: number;
  grandTotalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
}

export interface PerOutletPerformanceYearOutlet {
  id: string;
  name: string;
}

export interface PerOutletPerformanceYearMonth {
  month: number;
  outletTotalRevenue: number[];
  outletTotalExpenses: number[];
  outletNetProfit: number[];
  warehouseTotalExpenses: number;
  warehouseNetProfit: number;
  totalRevenue: number;
  grandTotalExpenses: number;
  totalBusinessNetProfit: number;
}

export interface PerOutletPerformanceYearEntitySummary {
  kind: string;
  outletId?: string | null;
  entityName: string;
  annualRevenue: number;
  annualExpenses: number;
  annualNetProfit: number;
  profitMarginPercent: number | null;
  avgMonthlyProfit: number;
}

export interface PerOutletPerformanceYear {
  year: number;
  warehouseId: string;
  warehouseName: string;
  outlets: PerOutletPerformanceYearOutlet[];
  months: PerOutletPerformanceYearMonth[];
  annualSummary: PerOutletPerformanceYearEntitySummary[];
}

export type PerOutletPerformanceGranularity =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

export interface PerOutletPerformancePeriod {
  periodKey: string;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  outletTotalRevenue: number[];
  outletTotalExpenses: number[];
  outletNetProfit: number[];
  warehouseTotalExpenses: number;
  warehouseNetProfit: number;
  totalRevenue: number;
  grandTotalExpenses: number;
  totalBusinessNetProfit: number;
}

export interface PerOutletPerformanceRangeEntitySummary {
  kind: string;
  outletId?: string | null;
  entityName: string;
  rangeRevenue: number;
  rangeExpenses: number;
  rangeNetProfit: number;
  profitMarginPercent: number | null;
  avgNetPerPeriod: number;
}

export interface PerOutletPerformanceReport {
  granularity: PerOutletPerformanceGranularity;
  fromDate: string;
  toDate: string;
  warehouseId: string;
  warehouseName: string;
  outlets: PerOutletPerformanceYearOutlet[];
  periods: PerOutletPerformancePeriod[];
  rangeSummary: PerOutletPerformanceRangeEntitySummary[];
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
  itemType: OutletItemType;
  costPrice: number;
  defaultSellPrice: number;
  createdAt: string;
}

export enum OutletItemType {
  Sale = 1,
  NonSale = 2,
}

export interface CreateOutletItemRequest {
  name: string;
  unit?: string | null;
  description?: string | null;
  itemType: OutletItemType;
  costPrice: number;
  defaultSellPrice: number;
}

export interface UpdateOutletItemRequest {
  name: string;
  unit?: string | null;
  description?: string | null;
  itemType: OutletItemType;
  costPrice: number;
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
  /** Super Admin warehouse-counter sale only; omit for WarehouseUser (uses JWT). */
  warehouseId?: string | null;
  saleAtUtc?: string | null;
  notes?: string | null;
  /** Optional delivery/service etc.; omitted means zero. */
  otherChargeAmount?: number | null;
  /** Must sum with bankPaidAmount to grand total (2 d.p.). */
  cashPaidAmount: number;
  bankPaidAmount: number;
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
  outletId?: string | null;
  outletName: string;
  warehouseId?: string | null;
  warehouseName: string;
  isWarehouseDirectSale: boolean;
  saleAtUtc: string;
  otherChargeAmount: number;
  grandTotal: number;
  cashPaidAmount: number;
  bankPaidAmount: number;
  createdAt: string;
}

/** Server margin estimate: menu-line COGS uses current menu item cost, not historical. */
export interface OutletSalesMarginEstimate {
  revenueTotal: number;
  estimatedCostTotal: number;
  saleCount: number;
}

export interface OutletSaleDetail {
  id: string;
  receiptNo: string;
  outletId?: string | null;
  outletName: string;
  warehouseId?: string | null;
  warehouseName: string;
  isWarehouseDirectSale: boolean;
  saleAtUtc: string;
  notes?: string | null;
  otherChargeAmount: number;
  grandTotal: number;
  cashPaidAmount: number;
  bankPaidAmount: number;
  createdAt: string;
  menuLines: OutletSaleMenuLine[];
  directLines: OutletSaleDirectLine[];
}

/** Matches backend OutletStockRemovalReason. */
export enum OutletStockRemovalReason {
  Damage = 1,
  StaffUse = 2,
}

export interface CreateOutletStockRemovalLine {
  stockSource: OutletStockSource;
  menuItemId?: string | null;
  outletItemId?: string | null;
  quantity: number;
}

export interface CreateOutletStockRemovalRequest {
  outletId?: string | null;
  entryAtUtc: string;
  reason: OutletStockRemovalReason;
  notes?: string | null;
  lines: CreateOutletStockRemovalLine[];
}

export interface OutletStockRemovalLineDetail {
  id: string;
  stockSource: OutletStockSource;
  menuItemId?: string | null;
  menuItemName: string;
  outletItemId?: string | null;
  outletItemName: string;
  quantity: number;
}

export interface OutletStockRemovalListItem {
  id: string;
  receiptNo: string;
  outletId: string;
  outletName: string;
  entryAtUtc: string;
  reason: OutletStockRemovalReason;
  createdAt: string;
  lineCount: number;
}

export interface OutletStockRemovalDetail {
  id: string;
  receiptNo: string;
  outletId: string;
  outletName: string;
  entryAtUtc: string;
  reason: OutletStockRemovalReason;
  notes?: string | null;
  createdAt: string;
  lines: OutletStockRemovalLineDetail[];
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

export interface OutletDailyStockReportMenuRow {
  menuItemId: string;
  itemName: string;
  openingStock: number;
  transferIn: number;
  sold: number;
  damage: number;
  staff: number;
  closingStock: number;
}

export interface OutletDailyStockReportDirectRow {
  outletItemId: string;
  itemName: string;
  openingStock: number;
  purchasedIn: number;
  sold: number;
  damage: number;
  staff: number;
  closingStock: number;
}

export interface OutletDailyStockReportDay {
  /** ISO date (yyyy-MM-dd). */
  date: string;
  menuRows: OutletDailyStockReportMenuRow[];
  directRows: OutletDailyStockReportDirectRow[];
}

export interface OutletDailyStockReport {
  outletId: string;
  outletName: string;
  warehouseId: string;
  warehouseName: string;
  fromDate: string;
  toDate: string;
  days: OutletDailyStockReportDay[];
}

/** GET /api/reports/outlet-daily-sheet */
export interface OutletDailySheetCollection {
  date: string;
  cashCollection: number;
  bankCollection: number;
  totalCollection: number;
}

export interface OutletDailySheetMenuRow {
  menuItemId: string;
  itemName: string;
  opening: number;
  purchasedIn: number;
  available: number;
  sold: number;
  damage: number;
  staff: number;
  remaining: number;
  costPerUnit: number;
  sellPerUnit: number;
  salesValue: number;
  cogs: number;
  profit: number;
}

export interface OutletDailySheetDirectRow {
  outletItemId: string;
  itemName: string;
  opening: number;
  purchasedIn: number;
  available: number;
  sold: number;
  damage: number;
  staff: number;
  remaining: number;
  costPerUnit: number;
  sellPerUnit: number;
  salesValue: number;
  cogs: number;
  profit: number;
}

export interface OutletDailySheetExpenseRow {
  itemName: string;
  totalCost: number;
}

export interface OutletDailySheetSummary {
  totalSalesValue: number;
  otherChargeIncome: number;
  saleableCogs: number;
  grossProfit: number;
  otherPurchaseCost: number;
  netProfit: number;
}

export interface OutletDailySheetReport {
  date: string;
  outletId: string;
  outletName: string;
  warehouseId: string;
  warehouseName: string;
  includeExpenses: boolean;
  collection: OutletDailySheetCollection;
  menuRows: OutletDailySheetMenuRow[];
  directRows: OutletDailySheetDirectRow[];
  expenseRows: OutletDailySheetExpenseRow[];
  summary: OutletDailySheetSummary;
}

/** GET /api/reports/dashboard-stock-summary */
export interface DashboardStockTrendDay {
  date: string;
  stockIn: number;
  stockOut: number;
}

export interface DashboardStockBreakdownRow {
  key: string;
  label: string;
  group?: string | null;
  quantity: number;
}

export interface DashboardTransferOutByOutlet {
  outletId: string;
  outletName: string;
  quantity: number;
}

export interface DashboardWarehouseStockSummarySection {
  totalStockIn: number;
  totalStockOut: number;
  netMovement: number;
  closingStockUnits: number;
  breakdown: DashboardStockBreakdownRow[];
  trendByDay: DashboardStockTrendDay[];
  transferOutByOutlet: DashboardTransferOutByOutlet[];
}

export interface DashboardOutletStockComposition {
  sold: number;
  damage: number;
  staffUse: number;
}

export interface DashboardOutletStockSummarySection {
  totalStockIn: number;
  totalStockOut: number;
  netMovement: number;
  closingStockUnits: number;
  stockOutComposition: DashboardOutletStockComposition;
  breakdown: DashboardStockBreakdownRow[];
  trendByDay: DashboardStockTrendDay[];
}

export interface DashboardStockSummary {
  scopeKind: string;
  warehouseId?: string | null;
  warehouseName?: string | null;
  outletId?: string | null;
  outletName?: string | null;
  warehouse?: DashboardWarehouseStockSummarySection | null;
  outlet?: DashboardOutletStockSummarySection | null;
}

/** GET /api/reports/dashboard-financial-summary */
export interface DashboardFinancialDay {
  date: string;
  salesTotal: number;
  collectionTotal: number;
  estimatedCostTotal: number;
  estimatedNetProfit: number;
  warehousePurchaseExpense: number;
  outletPurchaseExpense: number;
  totalPurchaseExpense: number;
}

export interface DashboardFinancialCategoryRow {
  categoryName: string;
  revenueTotal: number;
}

export interface DashboardFinancialOutletDayPoint {
  date: string;
  salesTotal: number;
}

export interface DashboardFinancialOutletDaySeries {
  outletId: string;
  outletName: string;
  points: DashboardFinancialOutletDayPoint[];
}

export interface DashboardFinancialSummary {
  fromDate: string;
  toDate: string;
  outletFilterId?: string | null;
  singleOutletScope: boolean;
  days: DashboardFinancialDay[];
  categoryMix: DashboardFinancialCategoryRow[];
  outletDailySales: DashboardFinancialOutletDaySeries[];
}
