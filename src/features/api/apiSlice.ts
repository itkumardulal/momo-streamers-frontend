import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  ApiResponse,
  CatalogItem,
  CompletePasswordSetupRequest,
  CreateCatalogItemRequest,
  CreateExpenseItemRequest,
  CreateMenuCategoryRequest,
  CreateMenuItemRequest,
  CreateOutletRequest,
  CreateRawMaterialItemRequest,
  CreateSupplierRequest,
  CreateUserRequest,
  CreateWarehouseRequest,
  ExpenseItem,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  MenuCategory,
  MenuItem,
  Outlet,
  RawMaterialItem,
  ResetPasswordWithOtpRequest,
  Supplier,
  UpdateCatalogItemRequest,
  UpdateExpenseItemRequest,
  UpdateMenuCategoryRequest,
  UpdateMenuItemRequest,
  UpdateOutletRequest,
  UpdateRawMaterialItemRequest,
  UpdateSupplierRequest,
  UpdateUserRequest,
  UpdateWarehouseRequest,
  User,
  Warehouse,
  WarehouseProductionDetail,
  WarehouseProductionListItem,
  CreateWarehouseProductionRequest,
  CreateRawMaterialPurchaseRequest,
  RawMaterialPurchaseDetail,
  RawMaterialPurchaseListItem,
  OutletItem,
  CreateOutletItemRequest,
  UpdateOutletItemRequest,
  CreateOutletItemPurchaseRequest,
  OutletItemPurchaseDetail,
  OutletItemPurchaseListItem,
  OutletSellableStockRow,
  CreateOutletSaleRequest,
  OutletSaleDetail,
  OutletSaleListItem,
  WarehouseTransferDetail,
  WarehouseTransferListItem,
  CreateWarehouseTransferRequest,
  WarehouseDailyStockReport,
} from "@/entities/types";
import type { AuthState } from "@/features/auth/authSlice";

const apiUrlFromEnv =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
const baseUrl = apiUrlFromEnv || "https://localhost:44336";

type StateWithAuth = { auth: AuthState };

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as StateWithAuth).auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: [
    "Outlet",
    "Warehouse",
    "User",
    "MenuCategory",
    "CatalogItem",
    "MenuItem",
    "RawMaterialItem",
    "ExpenseItem",
    "Supplier",
    "WarehouseTransfer",
    "WarehouseProduction",
    "RawMaterialPurchase",
    "OutletItem",
    "OutletItemPurchase",
    "OutletSale",
    "OutletSellableStock",
  ],
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<LoginResponse>, LoginRequest>({
      query: (body) => ({
        url: "/api/auth/login",
        method: "POST",
        body,
        validateStatus: (response) =>
          response.status === 200 || response.status === 401,
      }),
    }),
    completePasswordSetup: builder.mutation<
      ApiResponse<null>,
      CompletePasswordSetupRequest
    >({
      query: (body) => ({
        url: "/api/auth/complete-password-setup",
        method: "POST",
        body,
      }),
    }),
    forgotPassword: builder.mutation<ApiResponse<null>, ForgotPasswordRequest>({
      query: (body) => ({
        url: "/api/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),
    resetPasswordWithOtp: builder.mutation<
      ApiResponse<null>,
      ResetPasswordWithOtpRequest
    >({
      query: (body) => ({
        url: "/api/auth/reset-password",
        method: "POST",
        body,
      }),
    }),
    getWarehouses: builder.query<ApiResponse<Warehouse[]>, void>({
      query: () => "/api/warehouses",
      providesTags: ["Warehouse"],
    }),
    createWarehouse: builder.mutation<
      ApiResponse<Warehouse>,
      CreateWarehouseRequest
    >({
      query: (body) => ({
        url: "/api/warehouses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Warehouse"],
    }),
    updateWarehouse: builder.mutation<
      ApiResponse<Warehouse>,
      { id: string; body: UpdateWarehouseRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/warehouses/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Warehouse", "Outlet"],
    }),
    deleteWarehouse: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/api/warehouses/${id}`, method: "DELETE" }),
      invalidatesTags: ["Warehouse", "Outlet"],
    }),
    getOutlets: builder.query<ApiResponse<Outlet[]>, void>({
      query: () => "/api/outlets",
      providesTags: ["Outlet"],
    }),
    createOutlet: builder.mutation<ApiResponse<Outlet>, CreateOutletRequest>({
      query: (body) => ({
        url: "/api/outlets",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Outlet"],
    }),
    updateOutlet: builder.mutation<
      ApiResponse<Outlet>,
      { id: string; body: UpdateOutletRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/outlets/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Outlet", "MenuCategory", "MenuItem"],
    }),
    deleteOutlet: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/api/outlets/${id}`, method: "DELETE" }),
      invalidatesTags: ["Outlet", "MenuCategory", "MenuItem"],
    }),
    getUsers: builder.query<ApiResponse<User[]>, void>({
      query: () => "/api/users",
      providesTags: ["User"],
    }),
    createUser: builder.mutation<ApiResponse<User>, CreateUserRequest>({
      query: (body) => ({
        url: "/api/users",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    updateUser: builder.mutation<
      ApiResponse<User>,
      { id: string; body: UpdateUserRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/users/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["User"],
    }),
    deleteUser: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/api/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
    getMenuCategories: builder.query<ApiResponse<MenuCategory[]>, void>({
      query: () => "/api/menu-categories",
      providesTags: ["MenuCategory"],
    }),
    createMenuCategory: builder.mutation<
      ApiResponse<MenuCategory>,
      CreateMenuCategoryRequest
    >({
      query: (body) => ({
        url: "/api/menu-categories",
        method: "POST",
        body,
      }),
      invalidatesTags: ["MenuCategory", "CatalogItem"],
    }),
    updateMenuCategory: builder.mutation<
      ApiResponse<MenuCategory>,
      { id: string; body: UpdateMenuCategoryRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/menu-categories/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["MenuCategory", "MenuItem", "CatalogItem"],
    }),
    deleteMenuCategory: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/api/menu-categories/${id}`, method: "DELETE" }),
      invalidatesTags: ["MenuCategory", "MenuItem", "CatalogItem"],
    }),
    getCatalogItems: builder.query<ApiResponse<CatalogItem[]>, string | undefined>(
      {
        query: (menuWarehouseId) => ({
          url: "/api/catalog-items",
          ...(menuWarehouseId ? { params: { menuWarehouseId } } : {}),
        }),
        providesTags: ["CatalogItem"],
      },
    ),
    createCatalogItem: builder.mutation<
      ApiResponse<CatalogItem>,
      CreateCatalogItemRequest
    >({
      query: (body) => ({
        url: "/api/catalog-items",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CatalogItem"],
    }),
    updateCatalogItem: builder.mutation<
      ApiResponse<CatalogItem>,
      { id: string; body: UpdateCatalogItemRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/catalog-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["CatalogItem"],
    }),
    deleteCatalogItem: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/api/catalog-items/${id}`, method: "DELETE" }),
      invalidatesTags: ["CatalogItem"],
    }),
    getRawMaterialItems: builder.query<ApiResponse<RawMaterialItem[]>, void>({
      query: () => "/api/raw-material-items",
      providesTags: ["RawMaterialItem"],
    }),
    createRawMaterialItem: builder.mutation<
      ApiResponse<RawMaterialItem>,
      CreateRawMaterialItemRequest
    >({
      query: (body) => ({
        url: "/api/raw-material-items",
        method: "POST",
        body,
      }),
      invalidatesTags: ["RawMaterialItem"],
    }),
    updateRawMaterialItem: builder.mutation<
      ApiResponse<RawMaterialItem>,
      { id: string; body: UpdateRawMaterialItemRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/raw-material-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["RawMaterialItem"],
    }),
    deleteRawMaterialItem: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/api/raw-material-items/${id}`, method: "DELETE" }),
      invalidatesTags: ["RawMaterialItem"],
    }),
    getExpenseItems: builder.query<ApiResponse<ExpenseItem[]>, void>({
      query: () => "/api/expense-items",
      providesTags: ["ExpenseItem"],
    }),
    createExpenseItem: builder.mutation<
      ApiResponse<ExpenseItem>,
      CreateExpenseItemRequest
    >({
      query: (body) => ({
        url: "/api/expense-items",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ExpenseItem"],
    }),
    updateExpenseItem: builder.mutation<
      ApiResponse<ExpenseItem>,
      { id: string; body: UpdateExpenseItemRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/expense-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ExpenseItem"],
    }),
    deleteExpenseItem: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/api/expense-items/${id}`, method: "DELETE" }),
      invalidatesTags: ["ExpenseItem"],
    }),
    getSuppliers: builder.query<ApiResponse<Supplier[]>, string | undefined>({
      query: (forPurchaseContext) => ({
        url: "/api/suppliers",
        ...(forPurchaseContext
          ? { params: { forPurchaseContext } }
          : {}),
      }),
      providesTags: ["Supplier"],
    }),
    createSupplier: builder.mutation<
      ApiResponse<Supplier>,
      CreateSupplierRequest
    >({
      query: (body) => ({
        url: "/api/suppliers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Supplier"],
    }),
    updateSupplier: builder.mutation<
      ApiResponse<Supplier>,
      { id: string; body: UpdateSupplierRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/suppliers/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Supplier"],
    }),
    deleteSupplier: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/api/suppliers/${id}`, method: "DELETE" }),
      invalidatesTags: ["Supplier"],
    }),
    getMenuItems: builder.query<ApiResponse<MenuItem[]>, string | undefined>({
      query: (warehouseId) => ({
        url: "/api/menu-items",
        ...(warehouseId ? { params: { warehouseId } } : {}),
      }),
      providesTags: ["MenuItem"],
    }),
    createMenuItem: builder.mutation<
      ApiResponse<MenuItem>,
      CreateMenuItemRequest
    >({
      query: (body) => ({
        url: "/api/menu-items",
        method: "POST",
        body,
      }),
      invalidatesTags: ["MenuItem", "CatalogItem"],
    }),
    updateMenuItem: builder.mutation<
      ApiResponse<MenuItem>,
      { id: string; body: UpdateMenuItemRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/menu-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["MenuItem", "CatalogItem"],
    }),
    deleteMenuItem: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/api/menu-items/${id}`, method: "DELETE" }),
      invalidatesTags: ["MenuItem", "CatalogItem"],
    }),
    getWarehouseTransfers: builder.query<
      ApiResponse<WarehouseTransferListItem[]>,
      { warehouseId?: string; outletId?: string } | void
    >({
      query: (arg) => ({
        url: "/api/warehouse-transfers",
        params: {
          ...(arg?.warehouseId ? { warehouseId: arg.warehouseId } : {}),
          ...(arg?.outletId ? { outletId: arg.outletId } : {}),
        },
      }),
      providesTags: [{ type: "WarehouseTransfer", id: "LIST" }],
    }),
    getWarehouseTransferById: builder.query<
      ApiResponse<WarehouseTransferDetail>,
      string
    >({
      query: (id) => `/api/warehouse-transfers/${id}`,
      providesTags: (_res, _err, id) => [{ type: "WarehouseTransfer", id }],
    }),
    createWarehouseTransfer: builder.mutation<
      ApiResponse<WarehouseTransferDetail>,
      CreateWarehouseTransferRequest
    >({
      query: (body) => ({
        url: "/api/warehouse-transfers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["WarehouseTransfer", "MenuItem"],
    }),
    getWarehouseProductions: builder.query<
      ApiResponse<WarehouseProductionListItem[]>,
      { warehouseId?: string } | void
    >({
      query: (arg) => ({
        url: "/api/warehouse-productions",
        params: arg?.warehouseId ? { warehouseId: arg.warehouseId } : {},
      }),
      providesTags: [{ type: "WarehouseProduction", id: "LIST" }],
    }),
    getWarehouseProductionById: builder.query<
      ApiResponse<WarehouseProductionDetail>,
      string
    >({
      query: (id) => `/api/warehouse-productions/${id}`,
      providesTags: (_res, _err, id) => [{ type: "WarehouseProduction", id }],
    }),
    createWarehouseProduction: builder.mutation<
      ApiResponse<WarehouseProductionDetail>,
      CreateWarehouseProductionRequest
    >({
      query: (body) => ({
        url: "/api/warehouse-productions",
        method: "POST",
        body,
      }),
      invalidatesTags: ["WarehouseProduction", "MenuItem"],
    }),
    getRawMaterialPurchases: builder.query<
      ApiResponse<RawMaterialPurchaseListItem[]>,
      { warehouseId?: string } | void
    >({
      query: (arg) => ({
        url: "/api/raw-material-purchases",
        params: arg?.warehouseId ? { warehouseId: arg.warehouseId } : {},
      }),
      providesTags: [{ type: "RawMaterialPurchase", id: "LIST" }],
    }),
    getRawMaterialPurchaseById: builder.query<
      ApiResponse<RawMaterialPurchaseDetail>,
      string
    >({
      query: (id) => `/api/raw-material-purchases/${id}`,
      providesTags: (_res, _err, id) => [{ type: "RawMaterialPurchase", id }],
    }),
    createRawMaterialPurchase: builder.mutation<
      ApiResponse<RawMaterialPurchaseDetail>,
      CreateRawMaterialPurchaseRequest
    >({
      query: (body) => ({
        url: "/api/raw-material-purchases",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "RawMaterialPurchase", id: "LIST" }],
    }),
    getOutletItems: builder.query<ApiResponse<OutletItem[]>, void>({
      query: () => "/api/outlet-items",
      providesTags: ["OutletItem"],
    }),
    createOutletItem: builder.mutation<
      ApiResponse<OutletItem>,
      CreateOutletItemRequest
    >({
      query: (body) => ({ url: "/api/outlet-items", method: "POST", body }),
      invalidatesTags: ["OutletItem"],
    }),
    updateOutletItem: builder.mutation<
      ApiResponse<OutletItem>,
      { id: string; body: UpdateOutletItemRequest }
    >({
      query: ({ id, body }) => ({
        url: `/api/outlet-items/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["OutletItem"],
    }),
    deleteOutletItem: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/api/outlet-items/${id}`, method: "DELETE" }),
      invalidatesTags: ["OutletItem"],
    }),
    getOutletItemPurchases: builder.query<
      ApiResponse<OutletItemPurchaseListItem[]>,
      { outletId?: string } | void
    >({
      query: (arg) => ({
        url: "/api/outlet-item-purchases",
        params: arg?.outletId ? { outletId: arg.outletId } : {},
      }),
      providesTags: [{ type: "OutletItemPurchase", id: "LIST" }],
    }),
    getOutletItemPurchaseById: builder.query<
      ApiResponse<OutletItemPurchaseDetail>,
      string
    >({
      query: (id) => `/api/outlet-item-purchases/${id}`,
      providesTags: (_r, _e, id) => [{ type: "OutletItemPurchase", id }],
    }),
    createOutletItemPurchase: builder.mutation<
      ApiResponse<OutletItemPurchaseDetail>,
      CreateOutletItemPurchaseRequest
    >({
      query: (body) => ({
        url: "/api/outlet-item-purchases",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "OutletItemPurchase", id: "LIST" },
        "OutletSellableStock",
      ],
    }),
    getOutletSellableStock: builder.query<
      ApiResponse<OutletSellableStockRow[]>,
      string | undefined
    >({
      query: (outletId) => ({
        url: "/api/outlet-sales/sellable-stock",
        ...(outletId ? { params: { outletId } } : {}),
      }),
      providesTags: ["OutletSellableStock"],
    }),
    getOutletSales: builder.query<
      ApiResponse<OutletSaleListItem[]>,
      { outletId?: string } | void
    >({
      query: (arg) => ({
        url: "/api/outlet-sales",
        params: arg?.outletId ? { outletId: arg.outletId } : {},
      }),
      providesTags: [{ type: "OutletSale", id: "LIST" }],
    }),
    getOutletSaleById: builder.query<ApiResponse<OutletSaleDetail>, string>({
      query: (id) => `/api/outlet-sales/${id}`,
      providesTags: (_r, _e, id) => [{ type: "OutletSale", id }],
    }),
    createOutletSale: builder.mutation<
      ApiResponse<OutletSaleDetail>,
      CreateOutletSaleRequest
    >({
      query: (body) => ({ url: "/api/outlet-sales", method: "POST", body }),
      invalidatesTags: [
        "OutletSellableStock",
        { type: "OutletSale", id: "LIST" },
        "MenuItem",
      ],
    }),
    getWarehouseDailyStockReport: builder.query<
      ApiResponse<WarehouseDailyStockReport>,
      { warehouseId?: string; fromDate: string; toDate: string }
    >({
      query: ({ warehouseId, fromDate, toDate }) => ({
        url: "/api/reports/warehouse-daily-stock",
        params: {
          fromDate,
          toDate,
          ...(warehouseId ? { warehouseId } : {}),
        },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useCompletePasswordSetupMutation,
  useForgotPasswordMutation,
  useResetPasswordWithOtpMutation,
  useGetWarehousesQuery,
  useCreateWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeleteWarehouseMutation,
  useGetOutletsQuery,
  useCreateOutletMutation,
  useUpdateOutletMutation,
  useDeleteOutletMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetMenuCategoriesQuery,
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useGetCatalogItemsQuery,
  useCreateCatalogItemMutation,
  useUpdateCatalogItemMutation,
  useDeleteCatalogItemMutation,
  useGetRawMaterialItemsQuery,
  useCreateRawMaterialItemMutation,
  useUpdateRawMaterialItemMutation,
  useDeleteRawMaterialItemMutation,
  useGetExpenseItemsQuery,
  useCreateExpenseItemMutation,
  useUpdateExpenseItemMutation,
  useDeleteExpenseItemMutation,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useGetMenuItemsQuery,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
  useGetWarehouseTransfersQuery,
  useGetWarehouseTransferByIdQuery,
  useLazyGetWarehouseTransferByIdQuery,
  useCreateWarehouseTransferMutation,
  useGetWarehouseProductionsQuery,
  useGetWarehouseProductionByIdQuery,
  useLazyGetWarehouseProductionByIdQuery,
  useCreateWarehouseProductionMutation,
  useGetRawMaterialPurchasesQuery,
  useGetRawMaterialPurchaseByIdQuery,
  useLazyGetRawMaterialPurchaseByIdQuery,
  useCreateRawMaterialPurchaseMutation,
  useGetOutletItemsQuery,
  useCreateOutletItemMutation,
  useUpdateOutletItemMutation,
  useDeleteOutletItemMutation,
  useGetOutletItemPurchasesQuery,
  useGetOutletItemPurchaseByIdQuery,
  useLazyGetOutletItemPurchaseByIdQuery,
  useCreateOutletItemPurchaseMutation,
  useGetOutletSellableStockQuery,
  useGetOutletSalesQuery,
  useGetOutletSaleByIdQuery,
  useLazyGetOutletSaleByIdQuery,
  useCreateOutletSaleMutation,
  useLazyGetWarehouseDailyStockReportQuery,
} = apiSlice;
