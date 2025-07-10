"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts"
import type { Expense } from "@/app/page"
import { formatCurrency } from "@/utils/currency"
import type { Currency } from "@/components/currency-setup"

interface ExpenseChartsProps {
  expenses: Expense[]
  currency?: Currency
}

export function ExpenseCharts({ expenses, currency }: ExpenseChartsProps) {
  // Add default currency fallback
  const defaultCurrency = currency || { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" }

  // Category breakdown data
  const categoryData = expenses.reduce(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    },
    {} as Record<string, number>,
  )

  const pieData = Object.entries(categoryData).map(([category, amount]) => ({
    name: category,
    value: amount,
    percentage: ((amount / expenses.reduce((sum, e) => sum + e.amount, 0)) * 100).toFixed(1),
  }))

  // Monthly spending data
  const monthlyData = expenses.reduce(
    (acc, expense) => {
      const month = new Date(expense.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      acc[month] = (acc[month] || 0) + expense.amount
      return acc
    },
    {} as Record<string, number>,
  )

  const barData = Object.entries(monthlyData)
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

  // Daily spending trend (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return date.toISOString().split("T")[0]
  }).reverse()

  const dailyData = last30Days.map((date) => {
    const dayExpenses = expenses.filter((e) => e.date === date)
    const total = dayExpenses.reduce((sum, e) => sum + e.amount, 0)
    return {
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: total,
    }
  })

  const COLORS = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ]

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Analytics</CardTitle>
          <CardDescription>Charts and insights about your spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No data available for charts</p>
            <p className="text-sm">Add some expenses to see analytics</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Distribution of expenses across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Amount",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => [formatCurrency(value, defaultCurrency), "Amount"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Totals</CardTitle>
            <CardDescription>Total spending per category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pieData
                .sort((a, b) => b.value - a.value)
                .map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(item.value, defaultCurrency)}</div>
                      <div className="text-xs text-gray-500">{item.percentage}%</div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Spending */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending</CardTitle>
          <CardDescription>Total expenses by month</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              amount: {
                label: "Amount",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [formatCurrency(value, defaultCurrency), "Amount"]}
                />
                <Bar dataKey="amount" fill="#4ECDC4" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Daily Spending Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Spending Trend</CardTitle>
          <CardDescription>Daily expenses over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              amount: {
                label: "Amount",
                color: "hsl(var(--chart-3))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  formatter={(value: number) => [formatCurrency(value, defaultCurrency), "Amount"]}
                />
                <Line type="monotone" dataKey="amount" stroke="#45B7D1" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
