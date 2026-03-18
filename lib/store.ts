import { z } from "zod"
import {
  TransactionSchema,
  CategorySchema,
  AccountSchema,
  BudgetSchema,
  SavingsGoalSchema,
  RecurringRuleSchema,
  AppSettingsSchema,
  LegacyExpenseSchema,
  CurrencySchema,
  type Transaction,
  type Category,
  type Account,
  type Budget,
  type SavingsGoal,
  type RecurringRule,
  type AppSettings,
  type Currency,
} from "./types"
import { STORAGE_KEYS, DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS, CURRENCIES } from "./constants"

// ─── Safe localStorage access ────────────────────────────────
function safeGetItem(key: string): string | null {
  try {
    if (typeof window === "undefined") return null
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return
    localStorage.setItem(key, value)
  } catch (e) {
    console.error(`Failed to write to localStorage key "${key}":`, e)
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window === "undefined") return
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// ─── Generic load/save with Zod validation ───────────────────
function loadArray<T>(key: string, schema: z.ZodTypeAny, fallback: T[]): T[] {
  const raw = safeGetItem(key)
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return fallback
    return parsed
      .map((item: unknown) => {
        const result = schema.safeParse(item)
        return result.success ? (result.data as T) : null
      })
      .filter((item: T | null): item is T => item !== null)
  } catch {
    return fallback
  }
}

function saveArray<T>(key: string, data: T[]): void {
  safeSetItem(key, JSON.stringify(data))
}

function loadObject<T>(key: string, schema: z.ZodTypeAny, fallback: T): T {
  const raw = safeGetItem(key)
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    const result = schema.safeParse(parsed)
    return result.success ? (result.data as T) : fallback
  } catch {
    return fallback
  }
}

function saveObject<T>(key: string, data: T): void {
  safeSetItem(key, JSON.stringify(data))
}

// ─── Default settings ────────────────────────────────────────
const DEFAULT_SETTINGS: AppSettings = {
  currency: CURRENCIES[0], // INR
  theme: "system",
  notifications: false,
  onboardingCompleted: false,
}

// ─── Migration from v1 (old format) ─────────────────────────
export function migrateFromLegacy(): {
  transactions: Transaction[]
  currency: Currency | null
} {
  const migrated = safeGetItem(STORAGE_KEYS.MIGRATED)
  if (migrated === "true") {
    return { transactions: [], currency: null }
  }

  const result: { transactions: Transaction[]; currency: Currency | null } = {
    transactions: [],
    currency: null,
  }

  // Migrate expenses
  const rawExpenses = safeGetItem(STORAGE_KEYS.LEGACY_EXPENSES)
  if (rawExpenses) {
    try {
      const parsed = JSON.parse(rawExpenses)
      if (Array.isArray(parsed)) {
        result.transactions = parsed
          .map((item: unknown) => {
            const legacy = LegacyExpenseSchema.safeParse(item)
            if (!legacy.success) return null
            const tx: Transaction = {
              id: legacy.data.id,
              type: "expense",
              amount: legacy.data.amount,
              category: legacy.data.category,
              description: legacy.data.description,
              date: legacy.data.date,
              account: "cash",
              tags: [],
              attachments: [],
              splitWith: [],
              createdAt: legacy.data.createdAt,
              updatedAt: legacy.data.createdAt,
            }
            return tx
          })
          .filter((tx: Transaction | null): tx is Transaction => tx !== null)
      }
    } catch {
      // Corrupt data, skip
    }
  }

  // Migrate currency
  const rawCurrency = safeGetItem(STORAGE_KEYS.LEGACY_CURRENCY)
  if (rawCurrency) {
    try {
      const parsed = JSON.parse(rawCurrency)
      const currencyResult = CurrencySchema.safeParse(parsed)
      if (currencyResult.success) {
        result.currency = currencyResult.data
      }
    } catch {
      // ignore
    }
  }

  // Mark as migrated
  safeSetItem(STORAGE_KEYS.MIGRATED, "true")

  return result
}

// ─── Store operations ────────────────────────────────────────
export const store = {
  // Transactions
  loadTransactions: (): Transaction[] =>
    loadArray(STORAGE_KEYS.TRANSACTIONS, TransactionSchema, []),
  saveTransactions: (data: Transaction[]) =>
    saveArray(STORAGE_KEYS.TRANSACTIONS, data),

  // Categories
  loadCategories: (): Category[] =>
    loadArray(STORAGE_KEYS.CATEGORIES, CategorySchema, DEFAULT_CATEGORIES),
  saveCategories: (data: Category[]) =>
    saveArray(STORAGE_KEYS.CATEGORIES, data),

  // Accounts
  loadAccounts: (): Account[] =>
    loadArray(STORAGE_KEYS.ACCOUNTS, AccountSchema, DEFAULT_ACCOUNTS),
  saveAccounts: (data: Account[]) =>
    saveArray(STORAGE_KEYS.ACCOUNTS, data),

  // Budgets
  loadBudgets: (): Budget[] =>
    loadArray(STORAGE_KEYS.BUDGETS, BudgetSchema, []),
  saveBudgets: (data: Budget[]) =>
    saveArray(STORAGE_KEYS.BUDGETS, data),

  // Goals
  loadGoals: (): SavingsGoal[] =>
    loadArray(STORAGE_KEYS.GOALS, SavingsGoalSchema, []),
  saveGoals: (data: SavingsGoal[]) =>
    saveArray(STORAGE_KEYS.GOALS, data),

  // Recurring Rules
  loadRecurring: (): RecurringRule[] =>
    loadArray(STORAGE_KEYS.RECURRING, RecurringRuleSchema, []),
  saveRecurring: (data: RecurringRule[]) =>
    saveArray(STORAGE_KEYS.RECURRING, data),

  // Settings
  loadSettings: (): AppSettings =>
    loadObject(STORAGE_KEYS.SETTINGS, AppSettingsSchema, DEFAULT_SETTINGS),
  saveSettings: (data: AppSettings) =>
    saveObject(STORAGE_KEYS.SETTINGS, data),

  // Export all data as JSON
  exportAllData: (): string => {
    return JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      transactions: store.loadTransactions(),
      categories: store.loadCategories(),
      accounts: store.loadAccounts(),
      budgets: store.loadBudgets(),
      goals: store.loadGoals(),
      recurring: store.loadRecurring(),
      settings: store.loadSettings(),
    }, null, 2)
  },

  // Import data from JSON
  importData: (jsonString: string): { success: boolean; error?: string; counts?: Record<string, number> } => {
    try {
      const data = JSON.parse(jsonString)

      const counts: Record<string, number> = {}

      const parseAndSave = <T,>(arr: unknown[], schema: z.ZodTypeAny, save: (d: T[]) => void): number => {
        const valid = arr
          .map((item) => schema.safeParse(item))
          .filter((r) => r.success)
          .map((r) => r.data as T)
        save(valid)
        return valid.length
      }

      if (Array.isArray(data.transactions))
        counts.transactions = parseAndSave<Transaction>(data.transactions, TransactionSchema, store.saveTransactions)
      if (Array.isArray(data.categories))
        counts.categories = parseAndSave<Category>(data.categories, CategorySchema, store.saveCategories)
      if (Array.isArray(data.accounts))
        counts.accounts = parseAndSave<Account>(data.accounts, AccountSchema, store.saveAccounts)
      if (Array.isArray(data.budgets))
        counts.budgets = parseAndSave<Budget>(data.budgets, BudgetSchema, store.saveBudgets)
      if (Array.isArray(data.goals))
        counts.goals = parseAndSave<SavingsGoal>(data.goals, SavingsGoalSchema, store.saveGoals)
      if (Array.isArray(data.recurring))
        counts.recurring = parseAndSave<RecurringRule>(data.recurring, RecurringRuleSchema, store.saveRecurring)

      if (data.settings) {
        const settingsResult = AppSettingsSchema.safeParse(data.settings)
        if (settingsResult.success) {
          store.saveSettings(settingsResult.data as AppSettings)
          counts.settings = 1
        }
      }

      return { success: true, counts }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : "Invalid JSON" }
    }
  },

  // Parse CSV import
  importCSV: (csvString: string): { success: boolean; transactions: Transaction[]; error?: string } => {
    try {
      const lines = csvString.trim().split("\n")
      if (lines.length < 2) {
        return { success: false, transactions: [], error: "CSV must have a header row and at least one data row" }
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase())
      const transactions: Transaction[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""))
        const row: Record<string, string> = {}
        headers.forEach((h, idx) => { row[h] = values[idx] || "" })

        const amount = parseFloat(row.amount || row.value || "0")
        if (isNaN(amount) || amount <= 0) continue

        const tx: Transaction = {
          id: Date.now().toString() + "-" + i,
          type: (row.type === "income" ? "income" : "expense"),
          amount,
          category: row.category || "Other",
          description: row.description || row.note || row.memo || `Import row ${i}`,
          date: row.date || new Date().toISOString().split("T")[0],
          account: row.account || "cash",
          tags: row.tags ? row.tags.split(";").map((t: string) => t.trim()) : [],
          attachments: [],
          splitWith: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        transactions.push(tx)
      }

      return { success: true, transactions }
    } catch (e) {
      return { success: false, transactions: [], error: e instanceof Error ? e.message : "Failed to parse CSV" }
    }
  },

  // Clear all data
  clearAllData: () => {
    Object.values(STORAGE_KEYS).forEach(key => {
      safeRemoveItem(key)
    })
  },
}
