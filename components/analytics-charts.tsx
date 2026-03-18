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
  AreaChart,
  Area,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

// ─── Component ───────────────────────────────────────────────
export function AnalyticsCharts() {
  const { transactions, categories, settings } = useApp()
  const currency = settings.currency
  const [viewMode, setViewMode] = useState<"expenses" | "all">("all")

  // ── Monthly income vs expenses (last 6 months) ─────────────
  const monthlyData = useMemo(() => {
    const now = new Date()
    const months: { label: string; key: string; income: number; expenses: number }[] = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      months.push({ label, key, income: 0, expenses: 0 })
    }

    for (const tx of transactions) {
      const txMonth = tx.date.slice(0, 7)
      const bucket = months.find((m) => m.key === txMonth)
      if (bucket) {
        if (tx.type === "income") bucket.income += tx.amount
        else bucket.expenses += tx.amount
      }
    }

    return months
  }, [transactions])

  // ── Spending by category (current month) ───────────────────
  const categoryData = useMemo(() => {
    const now = new Date()
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    const map = new Map<string, number>()
    for (const tx of transactions) {
      if (tx.type !== "expense") continue
      if (!tx.date.startsWith(currentKey)) continue
      map.set(tx.category, (map.get(tx.category) || 0) + tx.amount)
    }

    const allCats = [...categories]
    return Array.from(map.entries())
      .map(([catId, amount]) => {
        const cat = allCats.find((c) => c.id === catId)
        return { name: cat?.name || catId, amount, icon: cat?.icon || "Circle" }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, categories])

  const categoryTotal = useMemo(
    () => categoryData.reduce((s, c) => s + c.amount, 0),
    [categoryData]
  )

  // ── Daily spending trend (last 30 days) ────────────────────
  const dailyData = useMemo(() => {
    const now = new Date()
    const days: { date: string; label: string; amount: number }[] = []

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split("T")[0]
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      days.push({ date: key, label, amount: 0 })
    }

    for (const tx of transactions) {
      if (tx.type !== "expense") continue
      const bucket = days.find((d) => d.date === tx.date)
      if (bucket) bucket.amount += tx.amount
    }

    return days
  }, [transactions])

  // ── Cumulative spending (current month) ────────────────────
  const cumulativeData = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const result: { day: number; label: string; cumulative: number }[] = []

    let running = 0
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      const dayTotal = transactions
        .filter((tx) => tx.type === "expense" && tx.date === dateStr)
        .reduce((s, tx) => s + tx.amount, 0)
      running += dayTotal
      result.push({ day, label: `${day}`, cumulative: running })
    }

    return result
  }, [transactions])

  // ── Category breakdown with trend vs last month ────────────
  const categoryBreakdown = useMemo(() => {
    const now = new Date()
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`

    const curMap = new Map<string, number>()
    const prevMap = new Map<string, number>()

    for (const tx of transactions) {
      if (tx.type !== "expense") continue
      const month = tx.date.slice(0, 7)
      if (month === curKey) curMap.set(tx.category, (curMap.get(tx.category) || 0) + tx.amount)
      if (month === prevKey) prevMap.set(tx.category, (prevMap.get(tx.category) || 0) + tx.amount)
    }

    const totalCur = Array.from(curMap.values()).reduce((s, v) => s + v, 0)

    return Array.from(curMap.entries())
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId)
        const prevAmount = prevMap.get(catId) || 0
        const changePercent = prevAmount > 0 ? ((amount - prevAmount) / prevAmount) * 100 : null
        return {
          catId,
          name: cat?.name || catId,
          icon: cat?.icon || "Circle",
          amount,
          percentage: totalCur > 0 ? (amount / totalCur) * 100 : 0,
          changePercent,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, categories])

  // ── Empty state ────────────────────────────────────────────
  const hasData = transactions.length > 0

  if (!hasData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No transaction data yet. Add some transactions to see analytics.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* View toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Analytics</h2>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "expenses" | "all")}>
          <TabsList>
            <TabsTrigger value="all">Income + Expenses</TabsTrigger>
            <TabsTrigger value="expenses">Expenses Only</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Income vs Expenses Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Overview (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Legend />
                  {viewMode === "all" && (
                    <Bar dataKey="income" name="Income" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                  )}
                  <Bar dataKey="expenses" name="Expenses" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Spending by Category (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="text-sm text-muted-foreground">No expenses this month</p>
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

        {/* Daily Spending Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily Spending (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Spending"
                    stroke={CHART_COLORS[0]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cumulative Spending Area Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cumulative Spending (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    name="Total Spent"
                    stroke={CHART_COLORS[2]}
                    fill={CHART_COLORS[2]}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Category Breakdown (This Month)</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryBreakdown.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No expense data this month</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 text-right font-medium">Amount</th>
                    <th className="pb-2 pr-4 text-right font-medium">%</th>
                    <th className="pb-2 text-right font-medium">vs Last Month</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((row) => (
                    <tr key={row.catId} className="border-b border-border/50">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <CategoryIcon name={row.icon} className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{row.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium text-foreground">
                        {formatCurrency(row.amount, currency)}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-muted-foreground">
                        {row.percentage.toFixed(1)}%
                      </td>
                      <td className="py-2.5 text-right">
                        {row.changePercent === null ? (
                          <span className="text-muted-foreground">New</span>
                        ) : (
                          <span
                            className={
                              row.changePercent > 0
                                ? "text-red-500"
                                : row.changePercent < 0
                                  ? "text-green-500"
                                  : "text-muted-foreground"
                            }
                          >
                            {row.changePercent > 0 ? "\u2191" : row.changePercent < 0 ? "\u2193" : "-"}
                            {Math.abs(row.changePercent).toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
