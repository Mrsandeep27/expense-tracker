"use client"

import { useMemo, useState } from "react"
import { useApp } from "@/components/app-provider"
import { CategoryIcon } from "@/components/category-icon"
import { formatCurrency } from "@/utils/currency"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function MonthlyReport() {
  const { transactions, categories, budgets, settings } = useApp()
  const currency = settings.currency

  // ── Available months from transaction data ─────────────────
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    for (const tx of transactions) {
      set.add(tx.date.slice(0, 7))
    }
    return Array.from(set).sort().reverse()
  }, [transactions])

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    return availableMonths.includes(current)
      ? current
      : availableMonths[0] || current
  })

  // ── Transactions for selected month ────────────────────────
  const monthTxs = useMemo(
    () => transactions.filter((tx) => tx.date.startsWith(selectedMonth)),
    [transactions, selectedMonth]
  )

  // ── Previous month key ─────────────────────────────────────
  const prevMonthKey = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number)
    const d = new Date(y, m - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
  }, [selectedMonth])

  const prevMonthTxs = useMemo(
    () => transactions.filter((tx) => tx.date.startsWith(prevMonthKey)),
    [transactions, prevMonthKey]
  )

  // ── Summary calculations ───────────────────────────────────
  const summary = useMemo(() => {
    const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
    const expenses = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    const net = income - expenses

    const prevExpenses = prevMonthTxs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0)

    const momChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : null

    // Days in selected month
    const [y, m] = selectedMonth.split("-").map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const dailyAvg = daysInMonth > 0 ? expenses / daysInMonth : 0

    // Top spending category
    const catMap = new Map<string, number>()
    for (const tx of monthTxs) {
      if (tx.type !== "expense") continue
      catMap.set(tx.category, (catMap.get(tx.category) || 0) + tx.amount)
    }
    let topCat = { name: "N/A", amount: 0, icon: "Circle" }
    if (catMap.size > 0) {
      const [topId, topAmt] = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0]
      const cat = categories.find((c) => c.id === topId)
      topCat = { name: cat?.name || topId, amount: topAmt, icon: cat?.icon || "Circle" }
    }

    return {
      income,
      expenses,
      net,
      txCount: monthTxs.length,
      dailyAvg,
      topCat,
      momChange,
    }
  }, [monthTxs, prevMonthTxs, selectedMonth, categories])

  // ── Category breakdown ─────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of monthTxs) {
      if (tx.type !== "expense") continue
      map.set(tx.category, (map.get(tx.category) || 0) + tx.amount)
    }
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0)
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId)
        return {
          catId,
          name: cat?.name || catId,
          icon: cat?.icon || "Circle",
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [monthTxs, categories])

  // ── Recent transactions ────────────────────────────────────
  const recentTxs = useMemo(() => {
    const sorted = [...monthTxs].sort((a, b) => b.date.localeCompare(a.date))
    return sorted.slice(0, 10)
  }, [monthTxs])

  const remainingCount = monthTxs.length - recentTxs.length

  // ── Budget compliance ──────────────────────────────────────
  const budgetCompliance = useMemo(() => {
    return budgets
      .filter((b) => b.period === "monthly")
      .map((budget) => {
        const spent = monthTxs
          .filter((tx) => tx.type === "expense" && tx.category === budget.categoryId)
          .reduce((s, t) => s + t.amount, 0)
        const cat = categories.find((c) => c.id === budget.categoryId)
        const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0
        return {
          id: budget.id,
          categoryName: cat?.name || budget.categoryId,
          icon: cat?.icon || "Circle",
          budgetAmount: budget.amount,
          spent,
          percentage,
          withinLimit: spent <= budget.amount,
        }
      })
  }, [budgets, monthTxs, categories])

  // ── Format month label ─────────────────────────────────────
  function formatMonthLabel(key: string) {
    const [y, m] = key.split("-").map(Number)
    return new Date(y, m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  if (availableMonths.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No transaction data yet. Add transactions to generate a report.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Monthly Report</h2>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {formatMonthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Income</p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(summary.income, currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(summary.expenses, currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Net Savings</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                summary.net >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(summary.net, currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Transactions</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary.txCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Daily Avg Spending</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {formatCurrency(summary.dailyAvg, currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Top Category</p>
            <div className="mt-1 flex items-center gap-1.5">
              <CategoryIcon name={summary.topCat.icon} className="h-5 w-5 text-muted-foreground" />
              <span className="text-lg font-bold text-foreground">{summary.topCat.name}</span>
            </div>
            {summary.topCat.amount > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(summary.topCat.amount, currency)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Month-over-Month</p>
            {summary.momChange === null ? (
              <p className="mt-1 text-lg font-bold text-muted-foreground">No prior data</p>
            ) : (
              <p
                className={`mt-1 text-2xl font-bold ${
                  summary.momChange > 0
                    ? "text-red-600 dark:text-red-400"
                    : summary.momChange < 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                }`}
              >
                {summary.momChange > 0 ? "\u2191" : summary.momChange < 0 ? "\u2193" : ""}
                {Math.abs(summary.momChange).toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryBreakdown.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No expenses this month</p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cat) => (
                <div key={cat.catId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CategoryIcon name={cat.icon} className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{cat.percentage.toFixed(1)}%</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(cat.amount, currency)}
                      </span>
                    </div>
                  </div>
                  <Progress value={cat.percentage} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income vs Expense Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Income vs Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Income</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(summary.income, currency)}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-green-500"
                  style={{
                    width: `${
                      summary.income + summary.expenses > 0
                        ? (summary.income / (summary.income + summary.expenses)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expenses</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(summary.expenses, currency)}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-red-500"
                  style={{
                    width: `${
                      summary.income + summary.expenses > 0
                        ? (summary.expenses / (summary.income + summary.expenses)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTxs.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No transactions this month</p>
          ) : (
            <div className="space-y-2">
              {recentTxs.map((tx) => {
                const cat = categories.find((c) => c.id === tx.category)
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon
                        name={cat?.icon || "Circle"}
                        className="h-4 w-4 text-muted-foreground"
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {cat?.name || tx.category} &middot; {tx.date}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        tx.type === "income"
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                )
              })}
              {remainingCount > 0 && (
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  and {remainingCount} more transaction{remainingCount > 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Compliance */}
      {budgetCompliance.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Budget Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budgetCompliance.map((b) => (
                <div key={b.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CategoryIcon name={b.icon} className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{b.categoryName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium ${
                          b.withinLimit
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {b.withinLimit ? "Within budget" : "Over budget"}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(b.spent, currency)} / {formatCurrency(b.budgetAmount, currency)}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(b.percentage, 100)}
                    className={`h-2 ${!b.withinLimit ? "[&>div]:bg-red-500" : ""}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
