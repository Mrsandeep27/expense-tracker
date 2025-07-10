"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Calendar } from "lucide-react"
import type { Expense } from "@/app/page"
import { formatCurrency } from "@/utils/currency"
import type { Currency } from "@/components/currency-setup"

interface MonthlyReportProps {
  expenses: Expense[]
  currency?: Currency
}

export function MonthlyReport({ expenses, currency }: MonthlyReportProps) {
  // Add default currency fallback
  const defaultCurrency = currency || { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" }

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  // Get available months from expenses
  const availableMonths = Array.from(
    new Set(
      expenses.map((expense) => {
        const date = new Date(expense.date)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }),
    ),
  )
    .sort()
    .reverse()

  // Add current month if not in expenses
  if (!availableMonths.includes(selectedMonth)) {
    availableMonths.unshift(selectedMonth)
  }

  // Filter expenses for selected month
  const monthExpenses = expenses.filter((expense) => {
    const expenseMonth = new Date(expense.date)
    const expenseMonthStr = `${expenseMonth.getFullYear()}-${String(expenseMonth.getMonth() + 1).padStart(2, "0")}`
    return expenseMonthStr === selectedMonth
  })

  // Calculate statistics
  const totalAmount = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const averagePerDay = totalAmount / new Date(selectedMonth + "-01").getDate()
  const transactionCount = monthExpenses.length

  // Category breakdown
  const categoryBreakdown = monthExpenses.reduce(
    (acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount
      return acc
    },
    {} as Record<string, number>,
  )

  const sortedCategories = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a)

  // Compare with previous month
  const [year, month] = selectedMonth.split("-").map(Number)
  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`

  const prevMonthExpenses = expenses.filter((expense) => {
    const expenseMonth = new Date(expense.date)
    const expenseMonthStr = `${expenseMonth.getFullYear()}-${String(expenseMonth.getMonth() + 1).padStart(2, "0")}`
    return expenseMonthStr === prevMonth
  })

  const prevMonthTotal = prevMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const monthlyChange = totalAmount - prevMonthTotal
  const monthlyChangePercent = prevMonthTotal > 0 ? (monthlyChange / prevMonthTotal) * 100 : 0

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-")
    return new Date(Number.parseInt(year), Number.parseInt(month) - 1).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    })
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      "Food & Dining": "bg-orange-100 text-orange-800",
      Transportation: "bg-blue-100 text-blue-800",
      Shopping: "bg-purple-100 text-purple-800",
      Entertainment: "bg-pink-100 text-pink-800",
      "Bills & Utilities": "bg-red-100 text-red-800",
      Healthcare: "bg-green-100 text-green-800",
      Travel: "bg-indigo-100 text-indigo-800",
      Education: "bg-yellow-100 text-yellow-800",
      Other: "bg-gray-100 text-gray-800",
    }
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Monthly Report
          </CardTitle>
          <CardDescription>Detailed analysis of your monthly spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label htmlFor="month-select" className="text-sm font-medium">
              Select Month:
            </label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonth(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalAmount, defaultCurrency)}</div>
            {prevMonthTotal > 0 && (
              <div
                className={`flex items-center gap-1 text-sm mt-1 ${
                  monthlyChange >= 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {monthlyChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(monthlyChangePercent).toFixed(1)}% vs last month
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{transactionCount}</div>
            <div className="text-sm text-gray-500 mt-1">Total expenses recorded</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Daily Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(averagePerDay, defaultCurrency)}</div>
            <div className="text-sm text-gray-500 mt-1">Average per day</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Top Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-600">{sortedCategories[0]?.[0] || "None"}</div>
            <div className="text-sm text-gray-500 mt-1">
              {formatCurrency(sortedCategories[0]?.[1] || 0, defaultCurrency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
          <CardDescription>Spending distribution for {formatMonth(selectedMonth)}</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No expenses recorded for this month</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCategories.map(([category, amount]) => {
                const percentage = ((amount / totalAmount) * 100).toFixed(1)
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={getCategoryColor(category)}>{category}</Badge>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(amount, defaultCurrency)}</div>
                        <div className="text-sm text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest expenses for {formatMonth(selectedMonth)}</CardDescription>
        </CardHeader>
        <CardContent>
          {monthExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions for this month</p>
            </div>
          ) : (
            <div className="space-y-3">
              {monthExpenses
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getCategoryColor(expense.category)}>{expense.category}</Badge>
                        <span className="text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</span>
                      </div>
                      <p className="font-medium">{expense.description}</p>
                    </div>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(expense.amount, defaultCurrency)}
                    </div>
                  </div>
                ))}
              {monthExpenses.length > 10 && (
                <div className="text-center text-sm text-gray-500 pt-2">
                  And {monthExpenses.length - 10} more transactions...
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
