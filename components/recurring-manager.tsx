"use client"

import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useApp } from "@/components/app-provider"
import {
  RecurringFormSchema,
  type RecurringFormData,
  type RecurringRule,
} from "@/lib/types"
import { formatCurrency } from "@/utils/currency"
import { CategoryIcon } from "@/components/category-icon"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"

function getNextOccurrence(
  lastProcessed: string | undefined,
  startDate: string,
  frequency: RecurringRule["frequency"]
): string {
  const from = lastProcessed || startDate
  const d = new Date(from)
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1)
      break
    case "weekly":
      d.setDate(d.getDate() + 7)
      break
    case "monthly":
      d.setMonth(d.getMonth() + 1)
      break
    case "yearly":
      d.setFullYear(d.getFullYear() + 1)
      break
  }
  return d.toISOString().split("T")[0]
}

export function RecurringManager() {
  const {
    recurringRules,
    categories,
    accounts,
    settings,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    loaded,
  } = useApp()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null)

  const form = useForm<RecurringFormData>({
    resolver: zodResolver(RecurringFormSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      category: "",
      description: "",
      account: "cash",
      frequency: "monthly",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    },
  })

  const watchType = form.watch("type")

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.type === watchType || c.type === "both"
      ),
    [categories, watchType]
  )

  function openAddDialog() {
    setEditingRule(null)
    form.reset({
      type: "expense",
      amount: 0,
      category: "",
      description: "",
      account: "cash",
      frequency: "monthly",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    })
    setDialogOpen(true)
  }

  function openEditDialog(rule: RecurringRule) {
    setEditingRule(rule)
    form.reset({
      type: rule.type,
      amount: rule.amount,
      category: rule.category,
      description: rule.description,
      account: rule.account,
      frequency: rule.frequency,
      startDate: rule.startDate,
      endDate: rule.endDate || "",
    })
    setDialogOpen(true)
  }

  function onSubmit(data: RecurringFormData) {
    const cleaned = {
      ...data,
      endDate: data.endDate || undefined,
    }
    if (editingRule) {
      updateRecurring(editingRule.id, cleaned)
    } else {
      addRecurring(cleaned)
    }
    setDialogOpen(false)
    setEditingRule(null)
    form.reset()
  }

  function toggleActive(rule: RecurringRule) {
    updateRecurring(rule.id, { isActive: !rule.isActive })
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
          <h2 className="text-2xl font-bold text-foreground">
            Recurring Transactions
          </h2>
          <p className="text-sm text-muted-foreground">
            Automate your regular income and expenses
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? "Edit Rule" : "Add Recurring Rule"}
              </DialogTitle>
              <DialogDescription>
                {editingRule
                  ? "Update your recurring transaction rule."
                  : "Set up an automatic recurring transaction."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            field.value === "expense" ? "default" : "outline"
                          }
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            field.onChange("expense")
                            form.setValue("category", "")
                          }}
                        >
                          Expense
                        </Button>
                        <Button
                          type="button"
                          variant={
                            field.value === "income" ? "default" : "outline"
                          }
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            field.onChange("income")
                            form.setValue("category", "")
                          }}
                        >
                          Income
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
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
                  name="category"
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
                          {filteredCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <CategoryIcon name={cat.icon} />
                                <span>{cat.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Monthly rent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              <div className="flex items-center gap-2">
                                <CategoryIcon name={acc.icon} />
                                <span>{acc.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
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
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date (optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
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
                    {editingRule ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {recurringRules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No recurring transactions set up. Add a rule to automate your
              regular income or expenses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recurringRules.map((rule) => {
            const category = categories.find((c) => c.id === rule.category)
            const account = accounts.find((a) => a.id === rule.account)
            const nextDate = getNextOccurrence(
              rule.lastProcessed,
              rule.startDate,
              rule.frequency
            )

            return (
              <Card
                key={rule.id}
                className={!rule.isActive ? "opacity-60" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          rule.type === "expense" ? "destructive" : "default"
                        }
                        className="text-xs"
                      >
                        {rule.type}
                      </Badge>
                      <CardTitle className="text-base">
                        {rule.description}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleActive(rule)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p
                    className={`text-xl font-bold ${
                      rule.type === "expense"
                        ? "text-red-500 dark:text-red-400"
                        : "text-green-500 dark:text-green-400"
                    }`}
                  >
                    {rule.type === "expense" ? "-" : "+"}
                    {formatCurrency(rule.amount, settings.currency)}
                  </p>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CategoryIcon
                        name={category?.icon || "Circle"}
                        className="h-4 w-4"
                      />
                      <span>{category?.name || "Unknown"}</span>
                    </div>
                    {account && (
                      <div className="flex items-center gap-2">
                        <CategoryIcon
                          name={account.icon}
                          className="h-4 w-4"
                        />
                        <span>{account.name}</span>
                      </div>
                    )}
                    <p className="capitalize">
                      Frequency: {rule.frequency}
                    </p>
                    <p>Next: {nextDate}</p>
                    {rule.lastProcessed && (
                      <p>Last processed: {rule.lastProcessed}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(rule)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete Recurring Rule
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;
                            {rule.description}&quot;? Previously generated
                            transactions will not be affected.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteRecurring(rule.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
