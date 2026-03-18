"use client"

import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useApp } from "@/components/app-provider"
import { AccountFormSchema, type AccountFormData, type Account } from "@/lib/types"
import { formatCurrency } from "@/utils/currency"
import { CategoryIcon } from "@/components/category-icon"
import { ACCOUNT_TYPES } from "@/lib/constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Plus, Pencil, Trash2, ArrowLeftRight, Wallet } from "lucide-react"
import { z } from "zod"

const PRESET_COLORS = [
  "#4CAF50", "#2196F3", "#FF5722", "#9C27B0", "#FF9800",
  "#00BCD4", "#E91E63", "#607D8B", "#795548", "#3F51B5",
]

const TransferSchema = z.object({
  fromAccount: z.string().min(1, "Select source account"),
  toAccount: z.string().min(1, "Select destination account"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
})
type TransferFormData = z.infer<typeof TransferSchema>

export function AccountManager() {
  const {
    accounts,
    transactions,
    settings,
    addAccount,
    updateAccount,
    deleteAccount,
    addTransaction,
    loaded,
  } = useApp()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const form = useForm<AccountFormData>({
    resolver: zodResolver(AccountFormSchema),
    defaultValues: {
      name: "",
      type: "cash",
      icon: "Wallet",
      color: "#4CAF50",
      initialBalance: 0,
    },
  })

  const transferForm = useForm<TransferFormData>({
    resolver: zodResolver(TransferSchema),
    defaultValues: {
      fromAccount: "",
      toAccount: "",
      amount: 0,
    },
  })

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {}
    for (const acc of accounts) {
      let balance = acc.initialBalance
      for (const tx of transactions) {
        if (tx.account !== acc.id) continue
        if (tx.type === "income") balance += tx.amount
        else if (tx.type === "expense") balance -= tx.amount
      }
      balances[acc.id] = balance
    }
    return balances
  }, [accounts, transactions])

  const totalBalance = useMemo(
    () => Object.values(accountBalances).reduce((sum, b) => sum + b, 0),
    [accountBalances]
  )

  const accountHasTransactions = useMemo(() => {
    const result: Record<string, boolean> = {}
    for (const acc of accounts) {
      result[acc.id] = transactions.some((t) => t.account === acc.id)
    }
    return result
  }, [accounts, transactions])

  function openAddDialog() {
    setEditingAccount(null)
    form.reset({
      name: "",
      type: "cash",
      icon: "Wallet",
      color: "#4CAF50",
      initialBalance: 0,
    })
    setDialogOpen(true)
  }

  function openEditDialog(account: Account) {
    setEditingAccount(account)
    form.reset({
      name: account.name,
      type: account.type,
      icon: account.icon,
      color: account.color,
      initialBalance: account.initialBalance,
    })
    setDialogOpen(true)
  }

  function onSubmit(data: AccountFormData) {
    if (editingAccount) {
      updateAccount(editingAccount.id, data)
    } else {
      addAccount(data)
    }
    setDialogOpen(false)
    setEditingAccount(null)
    form.reset()
  }

  function onTransfer(data: TransferFormData) {
    if (data.fromAccount === data.toAccount) return

    const today = new Date().toISOString().split("T")[0]
    const fromAcc = accounts.find((a) => a.id === data.fromAccount)
    const toAcc = accounts.find((a) => a.id === data.toAccount)

    addTransaction({
      type: "expense",
      amount: data.amount,
      category: "other-expense",
      description: `Transfer to ${toAcc?.name || "account"}`,
      date: today,
      account: data.fromAccount,
      tags: ["transfer"],
      splitWith: [],
    })

    addTransaction({
      type: "income",
      amount: data.amount,
      category: "other-income",
      description: `Transfer from ${fromAcc?.name || "account"}`,
      date: today,
      account: data.toAccount,
      tags: ["transfer"],
      splitWith: [],
    })

    setTransferOpen(false)
    transferForm.reset()
  }

  // Auto-select icon when type changes
  const watchType = form.watch("type")
  const selectedType = ACCOUNT_TYPES.find((t) => t.value === watchType)
  if (selectedType && form.getValues("icon") !== selectedType.icon) {
    form.setValue("icon", selectedType.icon)
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
          <h2 className="text-2xl font-bold text-foreground">Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Total: {formatCurrency(totalBalance, settings.currency)}
          </p>
        </div>
        <div className="flex gap-2">
          {accounts.length >= 2 && (
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Transfer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transfer Between Accounts</DialogTitle>
                  <DialogDescription>
                    Move money from one account to another.
                  </DialogDescription>
                </DialogHeader>
                <Form {...transferForm}>
                  <form
                    onSubmit={transferForm.handleSubmit(onTransfer)}
                    className="space-y-4"
                  >
                    <FormField
                      control={transferForm.control}
                      name="fromAccount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From</FormLabel>
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
                      control={transferForm.control}
                      name="toAccount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To</FormLabel>
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
                      control={transferForm.control}
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

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setTransferOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Transfer</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? "Edit Account" : "Add Account"}
                </DialogTitle>
                <DialogDescription>
                  {editingAccount
                    ? "Update your account details."
                    : "Create a new account to track your money."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Account name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
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
                            {ACCOUNT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <CategoryIcon name={type.icon} />
                                  <span>{type.label}</span>
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
                    name="initialBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Initial Balance</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
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
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_COLORS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              className={`h-8 w-8 rounded-full border-2 transition-transform ${
                                field.value === color
                                  ? "border-foreground scale-110"
                                  : "border-transparent"
                              }`}
                              style={{ backgroundColor: color }}
                              onClick={() => field.onChange(color)}
                            />
                          ))}
                        </div>
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
                      {editingAccount ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No accounts yet. Add your first account to start tracking your
              finances.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: account.color + "20" }}
                    >
                      <CategoryIcon
                        name={account.icon}
                        className="h-5 w-5"
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {account.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground capitalize">
                        {account.type.replace("-", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(account)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={accountHasTransactions[account.id]}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            {accountHasTransactions[account.id]
                              ? "This account has existing transactions and cannot be deleted. Remove or reassign the transactions first."
                              : `Are you sure you want to delete "${account.name}"? This action cannot be undone.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          {!accountHasTransactions[account.id] && (
                            <AlertDialogAction
                              onClick={() => deleteAccount(account.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          )}
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(
                    accountBalances[account.id] || 0,
                    settings.currency
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
