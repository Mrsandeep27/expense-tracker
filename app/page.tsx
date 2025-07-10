"use client"

import { useState, useEffect } from "react"
import { ExpenseForm } from "@/components/expense-form"
import { ExpenseList } from "@/components/expense-list"
import { MonthlyReport } from "@/components/monthly-report"
import { ExpenseCharts } from "@/components/expense-charts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Download, Plus } from "lucide-react"
import { CurrencySetup, type Currency } from "@/components/currency-setup"
import { ThemeToggle } from "@/components/theme-toggle"
import { formatCurrency } from "@/utils/currency"

export interface Expense {
  id: string
  amount: number
  category: string
  description: string
  date: string
  createdAt: string
}

export const CATEGORIES = [
  "Food & Dining",
  "Transportation",
  "Shopping",
  "Entertainment",
  "Bills & Utilities",
  "Healthcare",
  "Travel",
  "Education",
  "Other",
]

export default function ExpenseTracker() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [currency, setCurrency] = useState<Currency | null>(null)
  const [showCurrencySetup, setShowCurrencySetup] = useState(true)

  
  useEffect(() => {
    const savedExpenses = localStorage.getItem("expenses")
    if (savedExpenses) {
      setExpenses(JSON.parse(savedExpenses))
    }
  }, [])

  useEffect(() => {
    const savedCurrency = localStorage.getItem("selectedCurrency")
    if (savedCurrency) {
      const currencyData = JSON.parse(savedCurrency)
      setCurrency(currencyData)
      setShowCurrencySetup(false)
    }
  }, [])

  useEffect(() => {
    if (currency) {
      localStorage.setItem("selectedCurrency", JSON.stringify(currency))
    }
  }, [currency])

  
  useEffect(() => {
    localStorage.setItem("expenses", JSON.stringify(expenses))
  }, [expenses])

  const addExpense = (expenseData: Omit<Expense, "id" | "createdAt">) => {
    const newExpense: Expense = {
      ...expenseData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }
    setExpenses((prev) => [newExpense, ...prev])
    setShowForm(false)
  }

  const updateExpense = (id: string, expenseData: Omit<Expense, "id" | "createdAt">) => {
    setExpenses((prev) => prev.map((expense) => (expense.id === id ? { ...expense, ...expenseData } : expense)))
    setEditingExpense(null)
    setShowForm(false)
  }

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id))
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setShowForm(true)
  }

  const handleCancelEdit = () => {
    setEditingExpense(null)
    setShowForm(false)
  }

  const handleCurrencySelect = (selectedCurrency: Currency) => {
    setCurrency(selectedCurrency)
    setShowCurrencySetup(false)
  }

  const exportData = () => {
    const dataStr = JSON.stringify(expenses, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `expenses-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const currentMonth = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })

  if (showCurrencySetup || !currency) {
    return <CurrencySetup onCurrencySelect={handleCurrencySelect} />
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Expense Tracker</h1>
              <p className="text-gray-600 mt-1">Track your expenses and analyze spending patterns</p>
            </div>
            <div className="flex gap-2">
              <ThemeToggle />
              <Button onClick={exportData} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses, currency)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{currentMonth}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{expenses.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="expenses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-6">
            {showForm && (
              <ExpenseForm
                onSubmit={editingExpense ? (data) => updateExpense(editingExpense.id, data) : addExpense}
                onCancel={handleCancelEdit}
                initialData={editingExpense}
                isEditing={!!editingExpense}
                currency={currency}
              />
            )}
            <ExpenseList expenses={expenses} onEdit={handleEdit} onDelete={deleteExpense} currency={currency} />
          </TabsContent>

          <TabsContent value="charts">
            <ExpenseCharts expenses={expenses} currency={currency} />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyReport expenses={expenses} currency={currency} />
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
                <CardDescription>Available categories for organizing your expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CATEGORIES.map((category) => (
                    <div key={category} className="p-3 bg-gray-100 rounded-lg text-center font-medium">
                      {category}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
