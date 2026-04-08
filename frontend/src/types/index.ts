// ═══════════════════════════════════════════════════
// Hollies — TypeScript Types (match API DTOs exactly)
// ═══════════════════════════════════════════════════

export type UserRole = 'Admin' | 'AccountsManager' | 'HrOfficer' | 'BranchManager' | 'Cashier' | 'Viewer' | 'Adjuster' | 'AssetManager' | 'AssetReceivingManager'
export type Currency = 'USD' | 'ZiG' | 'ZWL' | 'ZAR'
export type ExpenseStatus = 'Pending' | 'Reviewed' | 'Approved' | 'Paid' | 'Acquitted' | 'Audited' | 'Reversed' | 'Rejected'
export type IncomeStatus = 'Pending' | 'Approved' | 'Rejected'
export type GrvStatus = 'Received' | 'Blank'
export type EmployeeStatus = 'Active' | 'Inactive' | 'Terminated'
export type AttendanceStatus = 'Present' | 'Absent' | 'HalfDay' | 'DoubleShift' | 'Leave'
export type PayrollStatus = 'Pending' | 'Approved' | 'Paid'
export type SupplierFlag = 'None' | 'Red' | 'Green' | 'Orange'

// ── Auth ─────────────────────────────────────────────────────────
export interface AuthResponse { accessToken: string; refreshToken: string; user: UserDto }
export interface UserDto {
  id: string; name: string; initials: string; email: string
  role: UserRole; permissions: string[]; branchId?: string; branchName?: string
}

// ── Reference ────────────────────────────────────────────────────
export interface BranchDto { id: string; name: string; regionName: string; regionId: string }
export interface RegionDto { id: string; name: string }
export interface CategoryDto { id: string; name: string }
export interface PaymentMethodDto {
  id: string; name: string; currency: Currency
  balance: number; incomeTotal: number; expenseTotal: number
}
export interface SupplierSummaryDto {
  id: string; name: string; phone?: string; flag: SupplierFlag
  balance: number; hasIncompleteDetails: boolean
}
export interface ProductDto {
  id: string; name: string; subName?: string; keywords?: string
  costPrice: number; sellingPrice: number; categoryId?: string
}
export interface CurrencyRateDto { id: string; code: string; name: string; rateToUsd: number; isBase: boolean }
export interface RevenuePointDto { id: string; name: string; branchId: string; branchName: string; type: string; isStockPoint: boolean; enabled: boolean }
export interface ReferenceData {
  branches: BranchDto[]; regions: RegionDto[]; categories: CategoryDto[]
  paymentMethods: PaymentMethodDto[]; products: ProductDto[]; workmen: ProductDto[]
  currencies: CurrencyRateDto[]; suppliers?: SupplierSummaryDto[]
}

// ── StockMaster types ─────────────────────────────────────────────
export type SmvStatus = 'Pending' | 'Approved' | 'Rejected'
export type TransferOutType = 'Compliment' | 'Breakage' | 'Ullage' | 'Debtor' | 'Other'
export type TransferOutStatus = 'Pending' | 'Approved' | 'Rejected'
export type CashUpStatus = 'Pending' | 'Approved' | 'Rejected'
export type AdjustmentDirection = 'Increase' | 'Reduce'
export type StockCountType = 'Opening' | 'Closing'
export type StockCountMethod = 'C1Only' | 'C1C2' | 'PrevClosing'
export type AssetStatus = 'Active' | 'OnLoan' | 'Damaged' | 'Sold' | 'WrittenOff'

export interface StockCountListDto {
  id: string; countNumber: string; date: string; branchName: string; rpName: string
  type: StockCountType; method: StockCountMethod; isFinalised: boolean
  createdBy: string; createdAt: string
}

export interface SmvListDto {
  id: string; smvNumber: string; date: string; branchName: string
  fromWarehouse?: string; fromRpName?: string
  toWarehouse?: string; toRpName?: string
  status: SmvStatus; isCrossBranch: boolean
  totalCost: number; totalSell: number; createdBy: string; createdAt: string
}

export interface TransferOutListDto {
  id: string; toNumber: string; date: string; branchName: string; rpName: string
  type: TransferOutType; status: TransferOutStatus; beneficiaryName?: string
  totalCost: number; totalSell: number; createdBy: string; createdAt: string
}

export interface CashUpListDto {
  id: string; caNumber: string; date: string; branchName: string
  pmName: string; totalUsd: number; status: CashUpStatus
  createdBy: string; createdAt: string
}

export interface StockSheetRow {
  productId: string; productName: string; subName?: string
  costPrice: number; sellingPrice: number
  opening: number; smvIn: number; total: number
  debtors: number; compliments: number; breakages: number; ullages: number
  smvOut: number; adj: number; theoretical: number
  closing?: number; sold?: number; salesValue?: number
}

export interface DebtorDto {
  id: string; name: string; phone?: string; branchName: string
  balance: number; creditLimit: number; createdAt: string
}

export interface AssetListDto {
  id: string; assetNumber: string; name: string; subName?: string; serialNumber?: string
  categoryName?: string; branchName: string; locationName?: string
  value: number; depreciationPct: number; status: AssetStatus
  responsiblePerson?: string; quantity: number
}

// ── Expenses ─────────────────────────────────────────────────────
export interface ExpenseListDto {
  id: string; expenseNumber: string; date: string
  branchName: string; regionName: string; categoryName: string
  supplierName?: string; currency: Currency; amount: number
  paymentMethodName: string; status: ExpenseStatus
  isFlagged: boolean; isGreenFlagged: boolean; isReversed: boolean
  createdByName: string; createdAt: string
}
export interface ExpenseDetailDto {
  id: string; expenseNumber: string; date: string; valueDate: string
  branchId: string; branchName: string; regionId: string; regionName: string
  categoryId: string; categoryName: string; budgetId?: string; expenseType: string
  supplierId?: string; supplierName?: string; workmanId?: string; workmanName?: string
  currency: Currency; amount: number; paymentMethodId: string; paymentMethodName: string
  status: ExpenseStatus; isFlagged: boolean; flagReason?: string
  isGreenFlagged: boolean; isReversed: boolean; notes?: string
  createdByName: string; reviewedByName?: string; approvedByName?: string; paidByName?: string
  history: ExpenseHistoryDto[]
}
export interface ExpenseHistoryDto {
  id: string; action: string; doneByName: string; notes?: string; createdAt: string
}

// ── GRV ──────────────────────────────────────────────────────────
export interface GrvListDto {
  id: string; grvNumber: string; date: string; supplierName: string
  receiptNumber?: string; regionName: string; warehouse: string
  currency: Currency; totalValue: number; status: GrvStatus; payType: string
  isFlagged: boolean; isGreenFlagged: boolean; createdByName: string; createdAt: string
}
export interface GrvDetailDto extends GrvListDto {
  supplierId: string; regionId: string; expenseId?: string; amountPaid: number
  products: GrvProductDto[]; history: GrvHistoryDto[]
}
export interface GrvProductDto {
  id: string; productName: string; quantity: number
  unitCost: number; currency: Currency; lineTotal: number
}
export interface GrvHistoryDto { id: string; action: string; doneByName: string; notes?: string; createdAt: string }

// ── Income ───────────────────────────────────────────────────────
export interface IncomeDto {
  id: string; incomeNumber: string; date: string; source: string
  paymentMethodName: string; currency: Currency; amount: number; status: IncomeStatus
  approvedByName?: string; rejectionReason?: string; isFlagged: boolean
  createdByName: string; createdAt: string
}

// ── Approvals ────────────────────────────────────────────────────
export interface PendingApprovalDto {
  id: string; type: string; description: string
  currency: Currency; amount: number; location: string; date: string; nextAction: string
}

// ── HR ───────────────────────────────────────────────────────────
export interface EmployeeListDto {
  id: string; employeeNumber: string; fullName: string; branchName: string
  position?: string; department?: string; grossSalary: number; currency: Currency; status: EmployeeStatus
}
export interface EmployeeDetailDto extends EmployeeListDto {
  firstName: string; lastName: string; branchId: string; startDate?: string
  idNumber?: string; phone?: string; address?: string; doubleShiftDefault: boolean; createdAt: string
}
export interface AttendanceDto {
  id: string; employeeId: string; employeeNumber: string; fullName: string
  date: string; status: AttendanceStatus; notes?: string
}
export interface PayrollEntryDto {
  id: string; employeeId: string; employeeNumber: string; fullName: string
  branchName: string; month: number; year: number
  daysWorked: number; doubleShiftDays: number
  grossSalary: number; calculatedPay: number; status: PayrollStatus; approvedByName?: string
}

// ── Reports ──────────────────────────────────────────────────────
export interface ExpenseReportDto {
  label: string
  byCategory: { name: string; total: number; count: number }[]
  byBranch: { name: string; total: number }[]
  grandTotal: number; expenseCount: number
}

// ── Paged result ─────────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[]; totalCount: number; page: number; pageSize: number
  totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean
}
