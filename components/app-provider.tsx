"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { store, migrateFromLegacy } from "@/lib/store"
import type {
  Transaction,
  Category,
  Account,
  Budget,
  SavingsGoal,
  RecurringRule,
  AppSettings,
  TransactionFormData,
  CategoryFormData,
  AccountFormData,
  BudgetFormData,
  GoalFormData,
  RecurringFormData,
} from "@/lib/types"

// ─── Context type ─────────────────────────────────────────────
interface AppContextValue {
  loaded: boolean

  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
  budgets: Budget[]
  goals: SavingsGoal[]
  recurringRules: RecurringRule[]
  settings: AppSettings

  addTransaction: (data: TransactionFormData) => void
  updateTransaction: (id: string, data: TransactionFormData) => void
  deleteTransaction: (id: string) => void

  addCategory: (data: CategoryFormData) => void
  updateCategory: (id: string, data: CategoryFormData) => void
  deleteCategory: (id: string) => void

  addAccount: (data: AccountFormData) => void
  updateAccount: (id: string, data: AccountFormData) => void
  deleteAccount: (id: string) => void

  addBudget: (data: BudgetFormData) => void
  updateBudget: (id: string, data: BudgetFormData) => void
  deleteBudget: (id: string) => void

  addGoal: (data: GoalFormData) => void
  updateGoal: (id: string, data: Partial<SavingsGoal>) => void
  deleteGoal: (id: string) => void
  contributeToGoal: (id: string, amount: number) => void

  addRecurring: (data: RecurringFormData) => void
  updateRecurring: (id: string, data: Partial<RecurringRule>) => void
  deleteRecurring: (id: string) => void

  updateSettings: (data: Partial<AppSettings>) => void

  totalBalance: number
  monthlyExpenses: number
  monthlyIncome: number

  exportData: () => void
  importData: (jsonString: string) => { success: boolean; error?: string; counts?: Record<string, number> }
  importCSV: (csvString: string) => { success: boolean; count: number; error?: string }
  clearAllData: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

// ─── Recurring helpers ────────────────────────────────────────
function getNextDate(from: string, frequency: RecurringRule["frequency"]): string {
  const d = new Date(from)
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1)
      break
    case "weekly":
      d.setDate(d.getDate() + 7)
      break
    case "monthly":
      d.setMonth(d.getMonth() + 1)
      break
    case "yearly":
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d.toISOString().split("T")[0]
}

function processRecurringRules(
  rules: RecurringRule[],
  existingTransactions: Transaction[]
): { newTransactions: Transaction[]; updatedRules: RecurringRule[] } {
  const today = new Date().toISOString().split("T")[0]
  const newTransactions: Transaction[] = []
  const updatedRules = rules.map((rule) => {
    if (!rule.isActive) return rule

    const start = rule.lastProcessed || rule.startDate
    let current = start

    // Generate transactions from lastProcessed (or startDate) until today
    let nextDue = getNextDate(current, rule.frequency)

    // If never processed and startDate <= today, the first occurrence is the startDate itself
    if (!rule.lastProcessed && rule.startDate <= today) {
      // Check if a transaction already exists for this rule on the start date
      const alreadyExists = existingTransactions.some(
        (t) => t.recurringId === rule.id && t.date === rule.startDate
      )
      if (!alreadyExists) {
        newTransactions.push({
          id: `${rule.id}-${rule.startDate}-${Date.now()}`,
          type: rule.type,
          amount: rule.amount,
          category: rule.category,
          description: rule.description,
          date: rule.startDate,
          account: rule.account,
          tags: [],
          attachments: [],
          recurringId: rule.id,
          splitWith: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      current = rule.startDate
      nextDue = getNextDate(current, rule.frequency)
    }

    // Process subsequent occurrences
    while (nextDue <= today) {
      if (rule.endDate && nextDue > rule.endDate) break

      const alreadyExists = [...existingTransactions, ...newTransactions].some(
        (t) => t.recurringId === rule.id && t.date === nextDue
      )

      if (!alreadyExists) {
        newTransactions.push({
          id: `${rule.id}-${nextDue}-${Date.now()}`,
          type: rule.type,
          amount: rule.amount,
          category: rule.category,
          description: rule.description,
          date: nextDue,
          account: rule.account,
          tags: [],
          attachments: [],
          recurringId: rule.id,
          splitWith: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }

      current = nextDue
      nextDue = getNextDate(current, rule.frequency)
    }

    return { ...rule, lastProcessed: current > start ? current : start }
  })

  return { newTransactions, updatedRules }
}

// ─── Provider ─────────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([])
  const [settings, setSettings] = useState<AppSettings>({
    currency: { code: "INR", symbol: "\u20B9", name: "Indian Rupee", locale: "en-IN" },
    theme: "system",
    notifications: false,
    onboardingCompleted: false,
  })

  // ── Load on mount ─────────────────────────────────────────
  useEffect(() => {
    // Run migration first
    const migrated = migrateFromLegacy()

    // Load all data from store
    let loadedTransactions = store.loadTransactions()
    const loadedCategories = store.loadCategories()
    const loadedAccounts = store.loadAccounts()
    const loadedBudgets = store.loadBudgets()
    const loadedGoals = store.loadGoals()
    const loadedRecurring = store.loadRecurring()
    const loadedSettings = store.loadSettings()

    // Merge migrated transactions
    if (migrated.transactions.length > 0) {
      loadedTransactions = [...loadedTransactions, ...migrated.transactions]
      store.saveTransactions(loadedTransactions)
    }

    // Apply migrated currency
    if (migrated.currency) {
      const updatedSettings = { ...loadedSettings, currency: migrated.currency }
      store.saveSettings(updatedSettings)
      setSettings(updatedSettings)
    } else {
      setSettings(loadedSettings)
    }

    // Process recurring rules
    const { newTransactions, updatedRules } = processRecurringRules(
      loadedRecurring,
      loadedTransactions
    )

    if (newTransactions.length > 0) {
      loadedTransactions = [...loadedTransactions, ...newTransactions]
      store.saveTransactions(loadedTransactions)
    }

    if (updatedRules !== loadedRecurring) {
      store.saveRecurring(updatedRules)
    }

    setTransactions(loadedTransactions)
    setCategories(loadedCategories)
    setAccounts(loadedAccounts)
    setBudgets(loadedBudgets)
    setGoals(loadedGoals)
    setRecurringRules(updatedRules)
    setLoaded(true)
  }, [])

  // ── Persist on change (only after loaded) ─────────────────
  useEffect(() => {
    if (!loaded) return
    store.saveTransactions(transactions)
  }, [transactions, loaded])

  useEffect(() => {
    if (!loaded) return
    store.saveCategories(categories)
  }, [categories, loaded])

  useEffect(() => {
    if (!loaded) return
    store.saveAccounts(accounts)
  }, [accounts, loaded])

  useEffect(() => {
    if (!loaded) return
    store.saveBudgets(budgets)
  }, [budgets, loaded])

  useEffect(() => {
    if (!loaded) return
    store.saveGoals(goals)
  }, [goals, loaded])

  useEffect(() => {
    if (!loaded) return
    store.saveRecurring(recurringRules)
  }, [recurringRules, loaded])

  useEffect(() => {
    if (!loaded) return
    store.saveSettings(settings)
  }, [settings, loaded])

  // ── Transaction CRUD ──────────────────────────────────────
  const addTransaction = useCallback((data: TransactionFormData) => {
    const now = new Date().toISOString()
    const tx: Transaction = {
      ...data,
      id: crypto.randomUUID(),
      attachments: [],
      createdAt: now,
      updatedAt: now,
    }
    setTransactions((prev) => [tx, ...prev])
  }, [])

  const updateTransaction = useCallback((id: string, data: TransactionFormData) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, ...data, updatedAt: new Date().toISOString() }
          : t
      )
    )
  }, [])

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Category CRUD ─────────────────────────────────────────
  const addCategory = useCallback((data: CategoryFormData) => {
    const cat: Category = {
      ...data,
      id: crypto.randomUUID(),
      isDefault: false,
    }
    setCategories((prev) => [...prev, cat])
  }, [])

  const updateCategory = useCallback((id: string, data: CategoryFormData) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c))
    )
  }, [])

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // ── Account CRUD ──────────────────────────────────────────
  const addAccount = useCallback((data: AccountFormData) => {
    const acc: Account = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    setAccounts((prev) => [...prev, acc])
  }, [])

  const updateAccount = useCallback((id: string, data: AccountFormData) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...data } : a))
    )
  }, [])

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  // ── Budget CRUD ───────────────────────────────────────────
  const addBudget = useCallback((data: BudgetFormData) => {
    const budget: Budget = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    setBudgets((prev) => [...prev, budget])
  }, [])

  const updateBudget = useCallback((id: string, data: BudgetFormData) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...data } : b))
    )
  }, [])

  const deleteBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id))
  }, [])

  // ── Goal CRUD ─────────────────────────────────────────────
  const addGoal = useCallback((data: GoalFormData) => {
    const goal: SavingsGoal = {
      ...data,
      id: crypto.randomUUID(),
      savedAmount: 0,
      createdAt: new Date().toISOString(),
    }
    setGoals((prev) => [...prev, goal])
  }, [])

  const updateGoal = useCallback((id: string, data: Partial<SavingsGoal>) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...data } : g))
    )
  }, [])

  const deleteGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const contributeToGoal = useCallback((id: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, savedAmount: g.savedAmount + amount } : g
      )
    )
  }, [])

  // ── Recurring CRUD ────────────────────────────────────────
  const addRecurring = useCallback((data: RecurringFormData) => {
    const rule: RecurringRule = {
      ...data,
      id: crypto.randomUUID(),
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    setRecurringRules((prev) => [...prev, rule])
  }, [])

  const updateRecurring = useCallback((id: string, data: Partial<RecurringRule>) => {
    setRecurringRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...data } : r))
    )
  }, [])

  const deleteRecurring = useCallback((id: string) => {
    setRecurringRules((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // ── Settings ──────────────────────────────────────────────
  const updateSettings = useCallback((data: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...data }))
  }, [])

  // ── Computed values ───────────────────────────────────────
  const { totalBalance, monthlyExpenses, monthlyIncome } = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const accountBalances = accounts.reduce((sum, a) => sum + a.initialBalance, 0)

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)

    const monthTxs = transactions.filter((t) => {
      const d = new Date(t.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })

    const monthlyExpenses = monthTxs
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)

    const monthlyIncome = monthTxs
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      totalBalance: accountBalances + totalIncome - totalExpense,
      monthlyExpenses,
      monthlyIncome,
    }
  }, [transactions, accounts])

  // ── Data management ───────────────────────────────────────
  const exportData = useCallback(() => {
    const jsonStr = store.exportAllData()
    const blob = new Blob([jsonStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expense-tracker-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const importData = useCallback(
    (jsonString: string) => {
      const result = store.importData(jsonString)
      if (result.success) {
        // Reload all data from store
        setTransactions(store.loadTransactions())
        setCategories(store.loadCategories())
        setAccounts(store.loadAccounts())
        setBudgets(store.loadBudgets())
        setGoals(store.loadGoals())
        setRecurringRules(store.loadRecurring())
        setSettings(store.loadSettings())
      }
      return result
    },
    []
  )

  const importCSV = useCallback(
    (csvString: string) => {
      const result = store.importCSV(csvString)
      if (result.success && result.transactions.length > 0) {
        setTransactions((prev) => {
          const merged = [...prev, ...result.transactions]
          store.saveTransactions(merged)
          return merged
        })
        return { success: true, count: result.transactions.length }
      }
      return { success: false, count: 0, error: result.error || "No valid transactions found" }
    },
    []
  )

  const clearAllData = useCallback(() => {
    store.clearAllData()
    setTransactions([])
    setCategories(store.loadCategories())
    setAccounts(store.loadAccounts())
    setBudgets([])
    setGoals([])
    setRecurringRules([])
    setSettings(store.loadSettings())
  }, [])

  // ── Context value ─────────────────────────────────────────
  const value = useMemo<AppContextValue>(
    () => ({
      loaded,
      transactions,
      categories,
      accounts,
      budgets,
      goals,
      recurringRules,
      settings,

      addTransaction,
      updateTransaction,
      deleteTransaction,

      addCategory,
      updateCategory,
      deleteCategory,

      addAccount,
      updateAccount,
      deleteAccount,

      addBudget,
      updateBudget,
      deleteBudget,

      addGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,

      addRecurring,
      updateRecurring,
      deleteRecurring,

      updateSettings,

      totalBalance,
      monthlyExpenses,
      monthlyIncome,

      exportData,
      importData,
      importCSV,
      clearAllData,
    }),
    [
      loaded,
      transactions,
      categories,
      accounts,
      budgets,
      goals,
      recurringRules,
      settings,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addCategory,
      updateCategory,
      deleteCategory,
      addAccount,
      updateAccount,
      deleteAccount,
      addBudget,
      updateBudget,
      deleteBudget,
      addGoal,
      updateGoal,
      deleteGoal,
      contributeToGoal,
      addRecurring,
      updateRecurring,
      deleteRecurring,
      updateSettings,
      totalBalance,
      monthlyExpenses,
      monthlyIncome,
      exportData,
      importData,
      importCSV,
      clearAllData,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────
export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
