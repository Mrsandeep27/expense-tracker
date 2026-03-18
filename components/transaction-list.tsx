"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Edit, Trash2, Search, ArrowUpDown, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useApp } from "@/components/app-provider"
import { CategoryIcon } from "@/components/category-icon"
import { CATEGORY_COLORS } from "@/lib/constants"
import { formatCurrency } from "@/utils/currency"
import type { Transaction } from "@/lib/types"

const PAGE_SIZE = 20

interface TransactionListProps {
  onEdit: (transaction: Transaction) => void
}

export function TransactionList({ onEdit }: TransactionListProps) {
  const { transactions, categories, accounts, settings, deleteTransaction } = useApp()

  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [accountFilter, setAccountFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category">("date")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const currency = settings.currency

  // Helper to get category by id
  const getCategoryById = (id: string) => categories.find((c) => c.id === id)
  const getAccountById = (id: string) => accounts.find((a) => a.id === id)

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions]

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter)
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter)
    }

    // Account filter
    if (accountFilter !== "all") {
      result = result.filter((t) => t.account === accountFilter)
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter((t) => t.date >= dateFrom)
    }
    if (dateTo) {
      result = result.filter((t) => t.date <= dateTo)
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter((t) => {
        const cat = getCategoryById(t.category)
        const catName = cat?.name?.toLowerCase() ?? ""
        return (
          t.description.toLowerCase().includes(term) ||
          catName.includes(term) ||
          t.tags.some((tag) => tag.toLowerCase().includes(term))
        )
      })
    }

    // Sort
    result.sort((a, b) => {
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

    return result
  }, [transactions, typeFilter, categoryFilter, accountFilter, dateFrom, dateTo, searchTerm, sortBy, categories])

  // Totals for filtered results
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)
    const expenses = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)
    return { income, expenses, net: income - expenses }
  }, [filteredTransactions])

  const visibleTransactions = filteredTransactions.slice(0, visibleCount)
  const hasMore = visibleCount < filteredTransactions.length

  const getCategoryColorClass = (categoryId: string) => {
    const cat = getCategoryById(categoryId)
    if (!cat) return "bg-secondary text-secondary-foreground"
    return CATEGORY_COLORS[cat.name] ?? "bg-secondary text-secondary-foreground"
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00")
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Unique categories present in transactions (for filter dropdown)
  const availableCategories = useMemo(() => {
    const ids = new Set(transactions.map((t) => t.category))
    return categories.filter((c) => ids.has(c.id))
  }, [transactions, categories])

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Transaction History</CardTitle>
        <CardDescription className="text-muted-foreground">
          View and manage your recorded transactions
        </CardDescription>

        {/* Totals Summary */}
        {filteredTransactions.length > 0 && (
          <div className="grid grid-cols-3 gap-3 pt-3">
            <div className="flex items-center gap-2 rounded-md border border-border p-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(totals.income, currency)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border p-2">
              <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                  -{formatCurrency(totals.expenses, currency)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border p-2">
              <Minus className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Net</p>
                <p
                  className={`text-sm font-semibold ${
                    totals.net >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {totals.net >= 0 ? "+" : ""}
                  {formatCurrency(Math.abs(totals.net), currency)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Type filter tabs */}
        <div className="pt-3">
          <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="expense">Expenses</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col gap-3 pt-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description, category, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={cat.icon} className="h-3 w-3" />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Account filter */}
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <span className="flex items-center gap-2">
                      <CategoryIcon name={acc.icon} className="h-3 w-3" />
                      {acc.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date from */}
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
              title="From date"
            />

            {/* Date to */}
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
              title="To date"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center">
            {transactions.length === 0 ? (
              <div className="space-y-2">
                <p className="text-lg font-medium text-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground">
                  Add your first transaction to start tracking your finances!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium text-foreground">No matching transactions</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filters.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleTransactions.map((transaction) => {
              const cat = getCategoryById(transaction.category)
              const acc = getAccountById(transaction.account)
              const isIncome = transaction.type === "income"

              return (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  {/* Category Icon */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <CategoryIcon
                      name={cat?.icon ?? "Circle"}
                      className="h-4 w-4 text-foreground"
                    />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {transaction.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${getCategoryColorClass(transaction.category)}`}
                      >
                        {cat?.name ?? transaction.category}
                      </Badge>
                      {acc && (
                        <span className="text-xs text-muted-foreground">{acc.name}</span>
                      )}
                      {transaction.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Right side: amount, date, actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(transaction.amount, currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                    <div className="flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onEdit(transaction)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{transaction.description}&quot;?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTransaction(transaction.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Show more button */}
            {hasMore && (
              <div className="pt-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                >
                  Show More ({filteredTransactions.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
