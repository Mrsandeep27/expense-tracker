"use client"

import { useState, useCallback, Suspense, lazy, useEffect } from "react"
import { useApp } from "@/components/app-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  Wallet,
  TrendingUp,
  Repeat,
  BarChart3,
  CalendarRange,
  CalendarDays,
  Settings,
  Tags,
  Plus,
  Menu,
  X,
  FileUp,
} from "lucide-react"
import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/utils/currency"

// ─── Lazy load all view components ────────────────────────────
const Dashboard = lazy(() => import("@/components/dashboard").then(m => ({ default: m.Dashboard })))
const TransactionForm = lazy(() => import("@/components/transaction-form").then(m => ({ default: m.TransactionForm })))
const TransactionList = lazy(() => import("@/components/transaction-list").then(m => ({ default: m.TransactionList })))
const BudgetManager = lazy(() => import("@/components/budget-manager").then(m => ({ default: m.BudgetManager })))
const AccountManager = lazy(() => import("@/components/account-manager").then(m => ({ default: m.AccountManager })))
const GoalTracker = lazy(() => import("@/components/goal-tracker").then(m => ({ default: m.GoalTracker })))
const RecurringManager = lazy(() => import("@/components/recurring-manager").then(m => ({ default: m.RecurringManager })))
const AnalyticsCharts = lazy(() => import("@/components/analytics-charts").then(m => ({ default: m.AnalyticsCharts })))
const MonthlyReport = lazy(() => import("@/components/monthly-report").then(m => ({ default: m.MonthlyReport })))
const YearReview = lazy(() => import("@/components/year-review").then(m => ({ default: m.YearReview })))
const CategoryManager = lazy(() => import("@/components/category-manager").then(m => ({ default: m.CategoryManager })))
const SettingsPanel = lazy(() => import("@/components/settings-panel").then(m => ({ default: m.SettingsPanel })))
const BankImportLazy = lazy(() => import("@/components/bank-import").then(m => ({ default: m.BankImport })))

// ─── Loading skeleton for views ─────────────────────────────
function ViewSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Types ──────────────────────────────────────────────────
type View =
  | "dashboard"
  | "transactions"
  | "bank-import"
  | "budgets"
  | "accounts"
  | "goals"
  | "recurring"
  | "analytics"
  | "monthly"
  | "yearly"
  | "categories"
  | "settings"

interface NavItem {
  id: View
  label: string
  icon: React.ReactNode
  group: string
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, group: "Overview" },
  { id: "transactions", label: "Transactions", icon: <ArrowLeftRight className="h-4 w-4" />, group: "Overview" },
  { id: "bank-import", label: "Import Statement", icon: <FileUp className="h-4 w-4" />, group: "Overview" },
  { id: "budgets", label: "Budgets", icon: <PieChart className="h-4 w-4" />, group: "Manage" },
  { id: "accounts", label: "Accounts", icon: <Wallet className="h-4 w-4" />, group: "Manage" },
  { id: "goals", label: "Savings Goals", icon: <Target className="h-4 w-4" />, group: "Manage" },
  { id: "recurring", label: "Recurring", icon: <Repeat className="h-4 w-4" />, group: "Manage" },
  { id: "analytics", label: "Charts", icon: <BarChart3 className="h-4 w-4" />, group: "Reports" },
  { id: "monthly", label: "Monthly Report", icon: <CalendarRange className="h-4 w-4" />, group: "Reports" },
  { id: "yearly", label: "Year Review", icon: <CalendarDays className="h-4 w-4" />, group: "Reports" },
  { id: "categories", label: "Categories", icon: <Tags className="h-4 w-4" />, group: "Settings" },
  { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" />, group: "Settings" },
]

export function MainApp() {
  const { loaded, totalBalance, monthlyExpenses, monthlyIncome, transactions, settings } = useApp()
  const [currentView, setCurrentView] = useState<View>("dashboard")
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [viewKey, setViewKey] = useState(0)

  // ─── Loading screen ─────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-muted" />
            <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Expense Tracker</p>
            <p className="text-sm text-muted-foreground">Loading your data...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setShowTransactionForm(true)
    setCurrentView("transactions")
  }

  const handleCloseForm = () => {
    setShowTransactionForm(false)
    setEditingTransaction(undefined)
  }

  const handleNavClick = (view: View) => {
    if (view !== currentView) {
      setViewKey(k => k + 1)
    }
    setCurrentView(view)
    setMobileNavOpen(false)
  }

  const groups = NAV_ITEMS.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, NavItem[]>)

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard />
      case "transactions":
        return (
          <div className="space-y-4">
            {showTransactionForm && (
              <TransactionForm
                editingTransaction={editingTransaction}
                onClose={handleCloseForm}
              />
            )}
            <TransactionList onEdit={handleEdit} />
          </div>
        )
      case "bank-import":
        return <BankImportLazy open={true} onOpenChange={(open) => { if (!open) setCurrentView("transactions") }} />
      case "budgets":
        return <BudgetManager />
      case "accounts":
        return <AccountManager />
      case "goals":
        return <GoalTracker />
      case "recurring":
        return <RecurringManager />
      case "analytics":
        return <AnalyticsCharts />
      case "monthly":
        return <MonthlyReport />
      case "yearly":
        return <YearReview />
      case "categories":
        return <CategoryManager />
      case "settings":
        return <SettingsPanel />
      default:
        return <Dashboard />
    }
  }

  const currentLabel = NAV_ITEMS.find((n) => n.id === currentView)?.label ?? "Dashboard"
  const recentCount = transactions.filter(t => {
    const d = new Date(t.createdAt)
    return Date.now() - d.getTime() < 86400000
  }).length

  return (
    <div className="flex h-screen bg-background">
      {/* ─── Desktop Sidebar ────────────────────────────────── */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border bg-card md:flex md:flex-col">
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-none">Expense Tracker</h1>
            <p className="text-[11px] text-muted-foreground">Personal Finance</p>
          </div>
        </div>

        {/* Balance summary */}
        <div className="border-b border-border px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Balance</p>
          <p className={cn(
            "text-xl font-bold tabular-nums",
            totalBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}>
            {formatCurrency(totalBalance, settings.currency)}
          </p>
          <div className="mt-2 flex gap-3 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(monthlyIncome, settings.currency)}
            </span>
            <span className="text-red-600 dark:text-red-400">
              -{formatCurrency(monthlyExpenses, settings.currency)}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-2">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-1">
              <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                    currentView === item.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "transition-transform duration-150",
                    currentView !== item.id && "group-hover:scale-110"
                  )}>
                    {item.icon}
                  </span>
                  {item.label}
                  {item.id === "transactions" && recentCount > 0 && currentView !== "transactions" && (
                    <Badge variant="secondary" className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px]">
                      {recentCount}
                    </Badge>
                  )}
                </button>
              ))}
              <Separator className="my-2 last:hidden" />
            </div>
          ))}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-4 flex items-center justify-between">
          <ThemeToggle />
          <p className="text-[10px] text-muted-foreground">v2.0</p>
        </div>
      </aside>

      {/* ─── Main Content ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col h-full">
                {/* Mobile nav brand */}
                <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                    <TrendingUp className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold text-foreground leading-none">Expense Tracker</h1>
                    <p className="text-[10px] text-muted-foreground">Personal Finance</p>
                  </div>
                </div>
                {/* Mobile balance */}
                <div className="border-b border-border px-4 py-3 shrink-0">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Balance</p>
                  <p className={cn(
                    "text-lg font-bold tabular-nums",
                    totalBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {formatCurrency(totalBalance, settings.currency)}
                  </p>
                </div>
                {/* Mobile nav items — scrollable */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  {Object.entries(groups).map(([group, items]) => (
                    <div key={group} className="mb-1">
                      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group}
                      </p>
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleNavClick(item.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                            currentView === item.id
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          {item.icon}
                          {item.label}
                        </button>
                      ))}
                      <Separator className="my-1.5" />
                    </div>
                  ))}
                </div>
                <div className="border-t border-border p-3 shrink-0">
                  <ThemeToggle />
                </div>
              </SheetContent>
            </Sheet>
            <div>
              <h2 className="text-base font-semibold text-foreground leading-none">{currentLabel}</h2>
              {currentView === "dashboard" && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <ThemeToggle />
            </div>
            <Button
              size="sm"
              className="h-9 gap-1.5 shadow-sm"
              onClick={() => {
                setEditingTransaction(undefined)
                setShowTransactionForm(true)
                setCurrentView("transactions")
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </header>

        {/* Page Content with transition */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-3 py-4 sm:px-4 md:p-6">
            <Suspense fallback={<ViewSkeleton />}>
              <div key={viewKey} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {renderView()}
              </div>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
