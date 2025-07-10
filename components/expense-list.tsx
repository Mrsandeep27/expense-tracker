"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Search, Filter } from "lucide-react"
import { type Expense, CATEGORIES } from "@/app/page"
import { formatCurrency } from "@/utils/currency"
import type { Currency } from "@/components/currency-setup"

interface ExpenseListProps {
  expenses: Expense[]
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  currency?: Currency
}

export function ExpenseList({ expenses, onEdit, onDelete, currency }: ExpenseListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date")

  // Add default currency fallback
  const defaultCurrency = currency || { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" }

  const filteredExpenses = expenses
    .filter((expense) => {
      const matchesSearch =
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "amount":
          return b.amount - a.amount
        case "category":
          return a.category.localeCompare(b.category)
        case "date":
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
    })

  const handleDelete = (id: string, description: string) => {
    if (confirm(`Are you sure you want to delete "${description}"?`)) {
      onDelete(id)
    }
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
    <Card>
      <CardHeader>
        <CardTitle>Expense History</CardTitle>
        <CardDescription>View and manage your recorded expenses</CardDescription>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {expenses.length === 0 ? (
              <div>
                <p className="text-lg font-medium">No expenses recorded yet</p>
                <p className="text-sm">Add your first expense to get started!</p>
              </div>
            ) : (
              <p>No expenses match your current filters</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={getCategoryColor(expense.category)}>{expense.category}</Badge>
                    <span className="text-sm text-gray-500">{new Date(expense.date).toLocaleDateString()}</span>
                  </div>
                  <p className="font-medium text-gray-900">{expense.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(expense.amount, defaultCurrency)}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(expense)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id, expense.description)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
