import type { Category, Account, Currency } from "./types"

// ─── Currencies ─────────────────────────────────────────────
export const CURRENCIES: Currency[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "en-IN" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "de-DE" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
]

// ─── Default Expense Categories ──────────────────────────────
export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: "food", name: "Food & Dining", icon: "Utensils", type: "expense", isDefault: true },
  { id: "transport", name: "Transportation", icon: "Car", type: "expense", isDefault: true },
  { id: "shopping", name: "Shopping", icon: "ShoppingBag", type: "expense", isDefault: true },
  { id: "entertainment", name: "Entertainment", icon: "Gamepad2", type: "expense", isDefault: true },
  { id: "bills", name: "Bills & Utilities", icon: "Receipt", type: "expense", isDefault: true },
  { id: "healthcare", name: "Healthcare", icon: "HeartPulse", type: "expense", isDefault: true },
  { id: "travel", name: "Travel", icon: "Plane", type: "expense", isDefault: true },
  { id: "education", name: "Education", icon: "GraduationCap", type: "expense", isDefault: true },
  { id: "rent", name: "Rent & Housing", icon: "Home", type: "expense", isDefault: true },
  { id: "subscriptions", name: "Subscriptions", icon: "Wifi", type: "expense", isDefault: true },
  { id: "groceries", name: "Groceries", icon: "ShoppingCart", type: "expense", isDefault: true },
  { id: "personal", name: "Personal Care", icon: "Sparkles", type: "expense", isDefault: true },
  { id: "other-expense", name: "Other", icon: "MoreHorizontal", type: "expense", isDefault: true },
]

// ─── Default Income Categories ───────────────────────────────
export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { id: "salary", name: "Salary", icon: "Briefcase", type: "income", isDefault: true },
  { id: "freelance", name: "Freelance", icon: "Laptop", type: "income", isDefault: true },
  { id: "investment", name: "Investment Returns", icon: "TrendingUp", type: "income", isDefault: true },
  { id: "business", name: "Business Income", icon: "Building2", type: "income", isDefault: true },
  { id: "rental-income", name: "Rental Income", icon: "Home", type: "income", isDefault: true },
  { id: "gift-income", name: "Gifts Received", icon: "Gift", type: "income", isDefault: true },
  { id: "refund", name: "Refund", icon: "RotateCcw", type: "income", isDefault: true },
  { id: "other-income", name: "Other Income", icon: "Coins", type: "income", isDefault: true },
]

// ─── All Default Categories ──────────────────────────────────
export const DEFAULT_CATEGORIES: Category[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
]

// ─── Default Accounts ────────────────────────────────────────
export const DEFAULT_ACCOUNTS: Account[] = [
  { id: "cash", name: "Cash", type: "cash", icon: "Wallet", color: "#4CAF50", initialBalance: 0, createdAt: new Date().toISOString() },
  { id: "bank", name: "Bank Account", type: "bank", icon: "Landmark", color: "#2196F3", initialBalance: 0, createdAt: new Date().toISOString() },
  { id: "credit-card", name: "Credit Card", type: "credit-card", icon: "CreditCard", color: "#FF5722", initialBalance: 0, createdAt: new Date().toISOString() },
]

// ─── Category Colors (dark mode compatible) ──────────────────
export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Transportation": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Shopping": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "Entertainment": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  "Bills & Utilities": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Healthcare": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Travel": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Education": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Rent & Housing": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "Subscriptions": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  "Groceries": "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300",
  "Personal Care": "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  "Other": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  "Salary": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Freelance": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "Investment Returns": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Business Income": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  "Rental Income": "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  "Gifts Received": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300",
  "Refund": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Other Income": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

// ─── Chart Colors ────────────────────────────────────────────
export const CHART_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
  "#F1948A", "#82E0AA", "#F8C471", "#AED6F1", "#D2B4DE",
]

// ─── Account Type Icons & Colors ─────────────────────────────
export const ACCOUNT_TYPES = [
  { value: "cash" as const, label: "Cash", icon: "Wallet", color: "#4CAF50" },
  { value: "bank" as const, label: "Bank Account", icon: "Landmark", color: "#2196F3" },
  { value: "credit-card" as const, label: "Credit Card", icon: "CreditCard", color: "#FF5722" },
  { value: "wallet" as const, label: "Digital Wallet", icon: "Smartphone", color: "#9C27B0" },
  { value: "investment" as const, label: "Investment", icon: "BarChart3", color: "#FF9800" },
]

// ─── Goal Icons ──────────────────────────────────────────────
export const GOAL_ICONS = [
  "Target", "Home", "Car", "Plane", "GraduationCap",
  "Heart", "Gift", "Smartphone", "Laptop", "Camera",
  "Dumbbell", "Music", "BookOpen", "ShoppingBag", "Gem",
]

// ─── Goal Colors ─────────────────────────────────────────────
export const GOAL_COLORS = [
  "#4ECDC4", "#FF6B6B", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#F7DC6F", "#BB8FCE", "#85C1E9", "#82E0AA",
]

// ─── Storage Keys ────────────────────────────────────────────
export const STORAGE_KEYS = {
  TRANSACTIONS: "et_transactions",
  CATEGORIES: "et_categories",
  ACCOUNTS: "et_accounts",
  BUDGETS: "et_budgets",
  GOALS: "et_goals",
  RECURRING: "et_recurring",
  SETTINGS: "et_settings",
  MIGRATED: "et_migrated_v2",
  // Legacy keys (for migration)
  LEGACY_EXPENSES: "expenses",
  LEGACY_CURRENCY: "selectedCurrency",
} as const
