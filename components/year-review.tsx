"use client"

import { useMemo, useState } from "react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { useApp } from "@/components/app-provider"
import { CategoryIcon } from "@/components/category-icon"
import { formatCurrency } from "@/utils/currency"
import { CHART_COLORS } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Currency } from "@/lib/types"

// ─── Custom Tooltip ──────────────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  currency: Currency
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      {label && <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{formatCurrency(entry.value, currency)}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { fill: string; percent: number } }>
  currency: Currency
}) {
  if (!active || !payload || payload.length === 0) return null
  const entry = payload[0]
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{entry.name}</p>
      <p className="text-sm text-muted-foreground">
        {formatCurrency(entry.value, currency)} ({(entry.payload.percent * 100).toFixed(1)}%)
      </p>
    </div>
  )
}

// ─── Month names ─────────────────────────────────────────────
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

export function YearReview() {
  const { transactions, categories, settings } = useApp()
  const currency = settings.currency

  // ── Available years ────────────────────────────────────────
  const availableYears = useMemo(() => {
    const set = new Set<number>()
    for (const tx of transactions) {
      set.add(Number(tx.date.slice(0, 4)))
    }
    const current = new Date().getFullYear()
    set.add(current)
    return Array.from(set).sort().reverse()
  }, [transactions])

  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear())

  // ── Transactions for the selected year ─────────────────────
  const yearTxs = useMemo(
    () => transactions.filter((tx) => tx.date.startsWith(String(selectedYear))),
    [transactions, selectedYear]
  )

  // ── Annual summary ────────────────────────────────────────
  const summary = useMemo(() => {
    const income = yearTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
    const expenses = yearTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    const net = income - expenses

    // Monthly spending map
    const monthlySpending = new Map<number, number>()
    for (const tx of yearTxs) {
      if (tx.type !== "expense") continue
      const m = Number(tx.date.slice(5, 7))
      monthlySpending.set(m, (monthlySpending.get(m) || 0) + tx.amount)
    }

    // Months with data
    const monthsWithData = monthlySpending.size || 1
    const avgMonthly = expenses / monthsWithData

    // Highest spending month
    let highestMonth = { month: "N/A", amount: 0 }
    if (monthlySpending.size > 0) {
      const [m, amt] = Array.from(monthlySpending.entries()).sort((a, b) => b[1] - a[1])[0]
      highestMonth = { month: MONTH_NAMES[m - 1], amount: amt }
    }

    // Most used category
    const catCount = new Map<string, number>()
    for (const tx of yearTxs) {
      if (tx.type !== "expense") continue
      catCount.set(tx.category, (catCount.get(tx.category) || 0) + 1)
    }
    let mostUsedCat = { name: "N/A", icon: "Circle", count: 0 }
    if (catCount.size > 0) {
      const [catId, count] = Array.from(catCount.entries()).sort((a, b) => b[1] - a[1])[0]
      const cat = categories.find((c) => c.id === catId)
      mostUsedCat = { name: cat?.name || catId, icon: cat?.icon || "Circle", count }
    }

    return { income, expenses, net, avgMonthly, highestMonth, mostUsedCat }
  }, [yearTxs, categories])

  // ── Monthly breakdown data (stacked bar) ───────────────────
  const monthlyData = useMemo(() => {
    const data = MONTH_NAMES.map((name, idx) => ({
      month: name,
      income: 0,
      expenses: 0,
    }))

    for (const tx of yearTxs) {
      const m = Number(tx.date.slice(5, 7)) - 1
      if (tx.type === "income") data[m].income += tx.amount
      else data[m].expenses += tx.amount
    }

    return data
  }, [yearTxs])

  // ── Category pie chart data (full year) ────────────────────
  const categoryData = useMemo(() => {
    const map = new Map<string, number>()
    for (const tx of yearTxs) {
      if (tx.type !== "expense") continue
      map.set(tx.category, (map.get(tx.category) || 0) + tx.amount)
    }

    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId)
        return { name: cat?.name || catId, amount, icon: cat?.icon || "Circle" }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [yearTxs, categories])

  // ── Monthly trends line chart ──────────────────────────────
  const trendsData = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => {
      const monthKey = `${selectedYear}-${String(idx + 1).padStart(2, "0")}`
      const monthTxs = yearTxs.filter((tx) => tx.date.startsWith(monthKey))
      const expenses = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
      const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
      return { month: name, expenses, income, savings: income - expenses }
    })
  }, [yearTxs, selectedYear])

  // ── Biggest transactions (top 10 expenses) ────────────────
  const biggestExpenses = useMemo(() => {
    return yearTxs
      .filter((tx) => tx.type === "expense")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
  }, [yearTxs])

  // ── Month-by-month comparison table ────────────────────────
  const monthTable = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => {
      const monthKey = `${selectedYear}-${String(idx + 1).padStart(2, "0")}`
      const mTxs = yearTxs.filter((tx) => tx.date.startsWith(monthKey))
      const income = mTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
      const expenses = mTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
      const txCount = mTxs.length
      return { month: name, income, expenses, net: income - expenses, txCount }
    })
  }, [yearTxs, selectedYear])

  const hasData = yearTxs.length > 0

  return (
    <div className="space-y-6">
      {/* Year Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Year in Review</h2>
        <Select
          value={String(selectedYear)}
          onValueChange={(v) => setSelectedYear(Number(v))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No transaction data for {selectedYear}.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Annual Summary Cards */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
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
                <p className="text-sm text-muted-foreground">Avg Monthly Spending</p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {formatCurrency(summary.avgMonthly, currency)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Highest Spending Month</p>
                <p className="mt-1 text-xl font-bold text-foreground">{summary.highestMonth.month}</p>
                {summary.highestMonth.amount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(summary.highestMonth.amount, currency)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Most Used Category</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <CategoryIcon name={summary.mostUsedCat.icon} className="h-5 w-5 text-muted-foreground" />
                  <span className="text-lg font-bold text-foreground">{summary.mostUsedCat.name}</span>
                </div>
                {summary.mostUsedCat.count > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {summary.mostUsedCat.count} transaction{summary.mostUsedCat.count > 1 ? "s" : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly Breakdown Stacked Bar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip content={<ChartTooltip currency={currency} />} />
                      <Legend />
                      <Bar dataKey="income" name="Income" stackId="a" fill={CHART_COLORS[1]} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" stackId="b" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Category Pie Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">No expenses this year</p>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="amount"
                          nameKey="name"
                        >
                          {categoryData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip currency={currency} />} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trends Line Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip content={<ChartTooltip currency={currency} />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="income"
                      name="Income"
                      stroke={CHART_COLORS[1]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      name="Expenses"
                      stroke={CHART_COLORS[0]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="savings"
                      name="Net Savings"
                      stroke={CHART_COLORS[2]}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Biggest Transactions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Biggest Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {biggestExpenses.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No expenses this year</p>
              ) : (
                <div className="space-y-2">
                  {biggestExpenses.map((tx, idx) => {
                    const cat = categories.find((c) => c.id === tx.category)
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {idx + 1}
                          </span>
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
                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(tx.amount, currency)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Month-by-Month Comparison Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Month-by-Month Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Month</th>
                      <th className="pb-2 pr-4 text-right font-medium">Income</th>
                      <th className="pb-2 pr-4 text-right font-medium">Expenses</th>
                      <th className="pb-2 pr-4 text-right font-medium">Net</th>
                      <th className="pb-2 text-right font-medium">Txns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthTable.map((row) => (
                      <tr key={row.month} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-medium text-foreground">{row.month}</td>
                        <td className="py-2 pr-4 text-right text-green-600 dark:text-green-400">
                          {row.income > 0 ? formatCurrency(row.income, currency) : "-"}
                        </td>
                        <td className="py-2 pr-4 text-right text-red-600 dark:text-red-400">
                          {row.expenses > 0 ? formatCurrency(row.expenses, currency) : "-"}
                        </td>
                        <td
                          className={`py-2 pr-4 text-right font-medium ${
                            row.net >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {row.income > 0 || row.expenses > 0
                            ? formatCurrency(row.net, currency)
                            : "-"}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {row.txCount > 0 ? row.txCount : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
