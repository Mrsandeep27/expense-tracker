"use client"

import { useMemo } from "react"
import { useApp } from "@/components/app-provider"
import { CategoryIcon } from "@/components/category-icon"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/utils/currency"
import { CATEGORY_COLORS, CHART_COLORS } from "@/lib/constants"
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarDays,
  CalendarRange,
  BarChart3,
  AlertTriangle,
  Target,
  Clock,
} from "lucide-react"

export function Dashboard() {
  const { transactions, budgets, goals: savingsGoals, categories, settings, totalBalance } = useApp()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // ─── Computed Values ────────────────────────────────────────

  const stats = useMemo(() => {
    const today = now.toISOString().slice(0, 10)

    // Start of current week (Monday)
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - mondayOffset)
    const weekStartStr = weekStart.toISOString().slice(0, 10)

    // Start of current month
    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`

    // Filter transactions for this month
    const monthTransactions = transactions.filter((t) => {
      return t.date >= monthStart && t.date.slice(0, 7) === `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`
    })

    const monthIncome = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)

    const monthExpenses = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)

    const netChange = monthIncome - monthExpenses

    // Today's spending
    const todaySpending = transactions
      .filter((t) => t.date === today && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)

    // This week's spending
    const weekSpending = transactions
      .filter((t) => t.date >= weekStartStr && t.date <= today && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)

    // Average daily spending this month
    const daysElapsed = now.getDate()
    const avgDaily = daysElapsed > 0 ? monthExpenses / daysElapsed : 0

    // Spending by category this month (top 5)
    const categorySpending: Record<string, number> = {}
    monthTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount
      })

    const topCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    const totalCategorySpending = topCategories.reduce((sum, [, amount]) => sum + amount, 0)

    // Budget usage
    const budgetAlerts = budgets
      .map((budget) => {
        const cat = categories.find((c) => c.id === budget.categoryId)
        const catName = cat?.name || budget.categoryId

        let spent = 0
        if (budget.period === "monthly") {
          spent = monthTransactions
            .filter((t) => t.type === "expense" && t.category === budget.categoryId)
            .reduce((sum, t) => sum + t.amount, 0)
        } else if (budget.period === "weekly") {
          spent = transactions
            .filter((t) => t.date >= weekStartStr && t.date <= today && t.type === "expense" && t.category === budget.categoryId)
            .reduce((sum, t) => sum + t.amount, 0)
        } else {
          // yearly
          const yearStart = `${currentYear}-01-01`
          spent = transactions
            .filter((t) => t.date >= yearStart && t.type === "expense" && t.category === budget.categoryId)
            .reduce((sum, t) => sum + t.amount, 0)
        }

        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

        return {
          id: budget.id,
          categoryId: budget.categoryId,
          categoryName: catName,
          categoryIcon: cat?.icon || "Circle",
          spent,
          limit: budget.amount,
          percentage,
          period: budget.period,
        }
      })
      .filter((b) => b.percentage > 75)
      .sort((a, b) => b.percentage - a.percentage)

    // Recent transactions (last 5)
    const recentTransactions = [...transactions]
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .slice(0, 5)

    return {
      monthIncome,
      monthExpenses,
      netChange,
      todaySpending,
      weekSpending,
      avgDaily,
      topCategories,
      totalCategorySpending,
      budgetAlerts,
      recentTransactions,
    }
  }, [transactions, budgets, categories, currentYear, currentMonth, now])

  // ─── Helpers ───────────────────────────────────────────────

  const fmt = (amount: number) => formatCurrency(amount, settings.currency)

  function getBudgetColor(percentage: number): string {
    if (percentage >= 90) return "text-red-600 dark:text-red-400"
    if (percentage >= 75) return "text-orange-600 dark:text-orange-400"
    if (percentage >= 50) return "text-yellow-600 dark:text-yellow-400"
    return "text-emerald-600 dark:text-emerald-400"
  }

  function getBudgetProgressColor(percentage: number): string {
    if (percentage >= 90) return "[&>div]:bg-red-500"
    if (percentage >= 75) return "[&>div]:bg-orange-500"
    if (percentage >= 50) return "[&>div]:bg-yellow-500"
    return "[&>div]:bg-emerald-500"
  }

  function getCategoryName(categoryId: string): string {
    const cat = categories.find((c) => c.id === categoryId)
    return cat?.name || categoryId
  }

  function getCategoryIcon(categoryId: string): string {
    const cat = categories.find((c) => c.id === categoryId)
    return cat?.icon || "Circle"
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00")
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (dateStr === today.toISOString().slice(0, 10)) return "Today"
    if (dateStr === yesterday.toISOString().slice(0, 10)) return "Yesterday"

    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  function daysRemaining(deadline: string): number {
    const target = new Date(deadline + "T00:00:00")
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Row 1: Balance Card */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
            <p className="text-4xl font-bold text-foreground tracking-tight">
              {fmt(totalBalance)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3">
              <div className="rounded-full bg-emerald-100 dark:bg-emerald-900/50 p-2">
                <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Income this month</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {fmt(stats.monthIncome)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
              <div className="rounded-full bg-red-100 dark:bg-red-900/50 p-2">
                <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expenses this month</p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {fmt(stats.monthExpenses)}
                </p>
              </div>
            </div>
          </div>

          {/* Net change */}
          <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-border">
            {stats.netChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span
              className={`text-sm font-medium ${
                stats.netChange >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {stats.netChange >= 0 ? "+" : ""}
              {fmt(stats.netChange)} net this month
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Row 2: Quick Stats */}
      <div className="flex gap-4 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
        <Card className="min-w-[160px] flex-shrink-0 bg-card border-border">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
            <p className="text-xl font-bold text-foreground">{fmt(stats.todaySpending)}</p>
          </CardContent>
        </Card>

        <Card className="min-w-[160px] flex-shrink-0 bg-card border-border">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarRange className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
            <p className="text-xl font-bold text-foreground">{fmt(stats.weekSpending)}</p>
          </CardContent>
        </Card>

        <Card className="min-w-[160px] flex-shrink-0 bg-card border-border">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Daily Average</p>
            </div>
            <p className="text-xl font-bold text-foreground">{fmt(stats.avgDaily)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Budget Alerts */}
      {budgets.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-base">Budget Alerts</CardTitle>
              </div>
              <a
                href="#budgets"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View All Budgets
              </a>
            </div>
            {stats.budgetAlerts.length === 0 && (
              <CardDescription>All budgets are under control.</CardDescription>
            )}
          </CardHeader>
          {stats.budgetAlerts.length > 0 && (
            <CardContent className="space-y-4">
              {stats.budgetAlerts.map((budget) => (
                <div key={budget.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CategoryIcon name={budget.categoryIcon} className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{budget.categoryName}</span>
                      <span className="text-xs text-muted-foreground capitalize">({budget.period})</span>
                    </div>
                    <span className={`text-sm font-semibold ${getBudgetColor(budget.percentage)}`}>
                      {Math.round(budget.percentage)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(budget.percentage, 100)}
                    className={`h-2 ${getBudgetProgressColor(budget.percentage)}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{fmt(budget.spent)} spent</span>
                    <span>{fmt(budget.limit)} limit</span>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Row 4: Recent Transactions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <a
              href="#transactions"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View All
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your first transaction to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentTransactions.map((tx) => {
                const catName = getCategoryName(tx.category)
                const catIcon = getCategoryIcon(tx.category)
                const colorClasses = CATEGORY_COLORS[catName] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"

                return (
                  <div key={tx.id} className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${colorClasses}`}>
                      <CategoryIcon name={catIcon} className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {catName} &middot; {formatDate(tx.date)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold whitespace-nowrap ${
                        tx.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 5: Spending by Category */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Top Spending Categories</CardTitle>
          <CardDescription>This month</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topCategories.length === 0 ? (
            <div className="text-center py-6">
              <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No spending data this month</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.topCategories.map(([categoryId, amount], index) => {
                const catName = getCategoryName(categoryId)
                const catIcon = getCategoryIcon(categoryId)
                const percentage =
                  stats.totalCategorySpending > 0
                    ? (amount / stats.totalCategorySpending) * 100
                    : 0
                const color = CHART_COLORS[index % CHART_COLORS.length]

                return (
                  <div key={categoryId} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CategoryIcon name={catIcon} className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{catName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-foreground">{fmt(amount)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {Math.round(percentage)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 6: Savings Goals */}
      {savingsGoals.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Savings Goals</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {savingsGoals.map((goal) => {
              const progress =
                goal.targetAmount > 0
                  ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100)
                  : 0
              const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0)

              return (
                <div key={goal.id} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="rounded-full p-2"
                        style={{ backgroundColor: goal.color + "20", color: goal.color }}
                      >
                        <CategoryIcon
                          name={goal.icon}
                          className="h-4 w-4"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{goal.name}</p>
                        {goal.deadline && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {daysRemaining(goal.deadline)} days left
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {Math.round(progress)}%
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: goal.color,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{fmt(goal.savedAmount)} saved</span>
                    <span>{fmt(goal.targetAmount)} target</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
