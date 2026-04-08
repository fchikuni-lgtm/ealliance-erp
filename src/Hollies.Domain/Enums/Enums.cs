namespace Hollies.Domain.Enums;

public enum ExpenseStatus
{
    Pending = 0,
    Reviewed = 1,
    Approved = 2,
    Paid = 3,
    Acquitted = 4,
    Audited = 5,
    Reversed = 6,
    Rejected = 7
}

public enum GrvStatus
{
    Received = 0,
    Blank = 1      // prepay — goods not yet delivered
}

public enum GrvPayType
{
    Cash = 0,
    Credit = 1,
    Prepay = 2
}

public enum IncomeStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

public enum EmployeeStatus
{
    Active = 0,
    Inactive = 1,
    Terminated = 2
}

public enum AttendanceStatus
{
    Present = 0,
    Absent = 1,
    HalfDay = 2,
    DoubleShift = 3,
    Leave = 4
}

public enum PayrollStatus
{
    Pending = 0,
    Approved = 1,
    Paid = 2
}

public enum SupplierFlag
{
    None = 0,
    Red = 1,        // overpaid / dispute
    Green = 2,      // over-supplied
    Orange = 3      // details incomplete
}

public enum ExpenseType
{
    General = 0,
    Asset = 1,
    Salary = 2,
    GrvRelated = 3
}

public enum UserRole
{
    Admin = 0,
    AccountsManager = 1,
    HrOfficer = 2,
    BranchManager = 3,
    Cashier = 4,
    Viewer = 5,
    Adjuster = 6,
    AssetManager = 7,
    AssetReceivingManager = 8
}

public enum Currency
{
    USD = 0,
    ZiG = 1,
    ZWL = 2,
    ZAR = 3
}

public enum Warehouse
{
    Main = 0,
    Branch = 1
}

// ── New eAlliance modules ─────────────────────────────────────────

public enum RevenuePointType
{
    Bar = 0,
    Restaurant = 1,
    BottleStore = 2,
    Other = 3
}

public enum StockCountType
{
    Opening = 0,
    Closing = 1
}

public enum StockCountMethod
{
    C1Only = 0,
    C1C2 = 1,
    PrevClosing = 2
}

public enum SmvStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

public enum TransferOutType
{
    Compliment = 0,
    Breakage = 1,
    Ullage = 2,
    Debtor = 3,
    Other = 4
}

public enum TransferOutStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

public enum CashUpStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

public enum AdjustmentDirection
{
    Increase = 0,
    Reduce = 1
}

public enum AdjustmentStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

public enum DebtorTransactionType
{
    Charge = 0,
    Payment = 1
}

public enum AssetStatus
{
    Active = 0,
    OnLoan = 1,
    Damaged = 2,
    Sold = 3,
    WrittenOff = 4
}

public enum AssetMovementStatus
{
    Pending = 0,
    Accepted = 1,
    Rejected = 2
}

public enum AssetLendingStatus
{
    Active = 0,
    Returned = 1,
    Overdue = 2
}

// Extended UserRole to include stock/asset roles
public enum UserRoleExtended
{
    Admin = 0,
    AccountsManager = 1,
    HrOfficer = 2,
    BranchManager = 3,
    Cashier = 4,
    Viewer = 5,
    Adjuster = 6,
    AssetManager = 7,
    AssetReceivingManager = 8
}
