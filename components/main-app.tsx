"use client"

import { useState } from "react"
import { useApp } from "@/components/app-provider"
import { Dashboard } from "@/components/dashboard"
import { TransactionForm } from "@/components/transaction-form"
import { TransactionList } from "@/components/transaction-list"
import { BudgetManager } from "@/components/budget-manager"
import { AccountManager } from "@/components/account-manager"
import { GoalTracker } from "@/components/goal-tracker"
import { RecurringManager } from "@/components/recurring-manager"
import { AnalyticsCharts } from "@/components/analytics-charts"
import { MonthlyReport } from "@/components/monthly-report"
import { YearReview } from "@/components/year-review"
import { CategoryManager } from "@/components/category-manager"
import { SettingsPanel } from "@/components/settings-panel"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
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
} from "lucide-react"
import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

type View =
  | "dashboard"
  | "transactions"
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
  const { loaded } = useApp()
  const [currentView, setCurrentView] = useState<View>("dashboard")
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (!loaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your data...</p>
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
    setCurrentView(view)
    setMobileNavOpen(false)
  }

  const groups = NAV_ITEMS.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {} as Record<string, NavItem[]>)

  const NavContent = () => (
    <div className="flex flex-col gap-1 p-2">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {group}
          </p>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                currentView === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <Separator className="my-2" />
        </div>
      ))}
    </div>
  )

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

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">ExpenseTracker</h1>
        </div>
        <ScrollArea className="flex-1">
          <NavContent />
        </ScrollArea>
        <div className="border-t border-border p-3">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            {/* Mobile Menu */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-0">
                <div className="flex h-14 items-center gap-2 border-b border-border px-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h1 className="text-lg font-bold">ExpenseTracker</h1>
                </div>
                <ScrollArea className="flex-1">
                  <NavContent />
                </ScrollArea>
              </SheetContent>
            </Sheet>
            <h2 className="text-lg font-semibold text-foreground">{currentLabel}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <ThemeToggle />
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingTransaction(undefined)
                setShowTransactionForm(true)
                setCurrentView("transactions")
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-6xl">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  )
}
