"use client"

import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useApp } from "@/components/app-provider"
import { BudgetFormSchema, type BudgetFormData, type Budget } from "@/lib/types"
import { formatCurrency } from "@/utils/currency"
import { CategoryIcon } from "@/components/category-icon"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Plus, Pencil, Trash2, PiggyBank } from "lucide-react"

function getProgressColor(percent: number): string {
  if (percent < 50) return "text-green-500"
  if (percent < 75) return "text-yellow-500"
  if (percent < 90) return "text-orange-500"
  return "text-red-500"
}

function getProgressBarClass(percent: number): string {
  if (percent < 50) return "[&>div]:bg-green-500"
  if (percent < 75) return "[&>div]:bg-yellow-500"
  if (percent < 90) return "[&>div]:bg-orange-500"
  return "[&>div]:bg-red-500"
}

function getPeriodRange(period: "monthly" | "weekly" | "yearly"): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  switch (period) {
    case "weekly": {
      const day = now.getDay()
      start.setDate(now.getDate() - day)
      end.setDate(start.getDate() + 6)
      break
    }
    case "monthly": {
      start.setDate(1)
      end.setMonth(end.getMonth() + 1, 0)
      break
    }
    case "yearly": {
      start.setMonth(0, 1)
      end.setMonth(11, 31)
      break
    }
  }

  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function BudgetManager() {
  const {
    budgets,
    categories,
    transactions,
    settings,
    addBudget,
    updateBudget,
    deleteBudget,
    loaded,
  } = useApp()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(BudgetFormSchema),
    defaultValues: {
      categoryId: "",
      amount: 0,
      period: "monthly",
    },
  })

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense" || c.type === "both"),
    [categories]
  )

  const availableCategories = useMemo(() => {
    const budgetedCategoryIds = new Set(
      budgets
        .filter((b) => (editingBudget ? b.id !== editingBudget.id : true))
        .map((b) => b.categoryId)
    )
    return expenseCategories.filter((c) => !budgetedCategoryIds.has(c.id))
  }, [expenseCategories, budgets, editingBudget])

  const budgetData = useMemo(() => {
    return budgets.map((budget) => {
      const category = categories.find((c) => c.id === budget.categoryId)
      const { start, end } = getPeriodRange(budget.period)

      const spent = transactions
        .filter((t) => {
          if (t.type !== "expense") return false
          if (t.category !== budget.categoryId) return false
          const d = new Date(t.date)
          return d >= start && d <= end
        })
        .reduce((sum, t) => sum + t.amount, 0)

      const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

      return { budget, category, spent, percent }
    })
  }, [budgets, categories, transactions])

  function openAddDialog() {
    setEditingBudget(null)
    form.reset({ categoryId: "", amount: 0, period: "monthly" })
    setDialogOpen(true)
  }

  function openEditDialog(budget: Budget) {
    setEditingBudget(budget)
    form.reset({
      categoryId: budget.categoryId,
      amount: budget.amount,
      period: budget.period,
    })
    setDialogOpen(true)
  }

  function onSubmit(data: BudgetFormData) {
    if (editingBudget) {
      updateBudget(editingBudget.id, data)
    } else {
      addBudget(data)
    }
    setDialogOpen(false)
    setEditingBudget(null)
    form.reset()
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Budgets</h2>
          <p className="text-sm text-muted-foreground">
            Track your spending limits by category
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBudget ? "Edit Budget" : "Add Budget"}
              </DialogTitle>
              <DialogDescription>
                {editingBudget
                  ? "Update your budget settings."
                  : "Set a spending limit for a category."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <CategoryIcon name={cat.icon} />
                                <span>{cat.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                          {editingBudget && (
                            <SelectItem value={editingBudget.categoryId}>
                              <div className="flex items-center gap-2">
                                <CategoryIcon
                                  name={
                                    categories.find(
                                      (c) =>
                                        c.id === editingBudget.categoryId
                                    )?.icon || "Circle"
                                  }
                                />
                                <span>
                                  {categories.find(
                                    (c) =>
                                      c.id === editingBudget.categoryId
                                  )?.name || "Unknown"}
                                </span>
                              </div>
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingBudget ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {budgetData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PiggyBank className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No budgets set. Create your first budget to track spending limits.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgetData.map(({ budget, category, spent, percent }) => (
            <Card key={budget.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon
                      name={category?.icon || "Circle"}
                      className="h-5 w-5"
                    />
                    <CardTitle className="text-base">
                      {category?.name || "Unknown"}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(budget)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the budget for{" "}
                            {category?.name || "this category"}? This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteBudget(budget.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className={getProgressColor(percent)}>
                    {formatCurrency(spent, settings.currency)} /{" "}
                    {formatCurrency(budget.amount, settings.currency)}
                  </span>
                  <span className={`font-medium ${getProgressColor(percent)}`}>
                    {Math.round(percent)}%
                  </span>
                </div>
                <Progress
                  value={Math.min(percent, 100)}
                  className={`h-2 ${getProgressBarClass(percent)}`}
                />
                <p className="text-xs text-muted-foreground capitalize">
                  {budget.period} budget
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
