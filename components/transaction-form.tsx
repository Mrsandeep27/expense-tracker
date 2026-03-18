"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { X, Plus, ChevronDown, Check } from "lucide-react"
import { useApp } from "@/components/app-provider"
import { CategoryIcon } from "@/components/category-icon"
import { TransactionFormSchema, type TransactionFormData, type Transaction } from "@/lib/types"

interface TransactionFormProps {
  editingTransaction?: Transaction
  onClose: () => void
}

export function TransactionForm({ editingTransaction, onClose }: TransactionFormProps) {
  const { categories, accounts, settings, addTransaction, updateTransaction } = useApp()
  const [tagInput, setTagInput] = useState("")
  const [splitOpen, setSplitOpen] = useState(false)
  const [splitName, setSplitName] = useState("")
  const [splitAmount, setSplitAmount] = useState("")

  const currencySymbol = settings.currency?.symbol ?? "$"

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(TransactionFormSchema),
    defaultValues: {
      type: editingTransaction?.type ?? "expense",
      amount: editingTransaction?.amount ?? (undefined as unknown as number),
      category: editingTransaction?.category ?? "",
      description: editingTransaction?.description ?? "",
      date: editingTransaction?.date ?? new Date().toISOString().split("T")[0],
      account: editingTransaction?.account ?? (accounts[0]?.id ?? "cash"),
      tags: editingTransaction?.tags ?? [],
      splitWith: editingTransaction?.splitWith ?? [],
    },
  })

  const { fields: splitFields, append: appendSplit, remove: removeSplit, update: updateSplit } = useFieldArray({
    control: form.control,
    name: "splitWith",
  })

  const selectedType = form.watch("type")
  const tags = form.watch("tags")

  // Filter categories by selected type
  const filteredCategories = categories.filter(
    (cat) => cat.type === selectedType || cat.type === "both"
  )

  // Reset category when type changes (unless editing)
  useEffect(() => {
    if (!editingTransaction) {
      const currentCategory = form.getValues("category")
      const validForType = filteredCategories.some((c) => c.id === currentCategory)
      if (!validForType) {
        form.setValue("category", "")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType])

  // Open split section if editing and has splits
  useEffect(() => {
    if (editingTransaction?.splitWith && editingTransaction.splitWith.length > 0) {
      setSplitOpen(true)
    }
  }, [editingTransaction])

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      form.setValue("tags", [...tags, trimmed])
    }
    setTagInput("")
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    } else if (e.key === "," && tagInput.trim()) {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleRemoveTag = (tag: string) => {
    form.setValue("tags", tags.filter((t) => t !== tag))
  }

  const handleAddSplit = () => {
    const name = splitName.trim()
    const amount = parseFloat(splitAmount)
    if (name && amount > 0) {
      appendSplit({ name, amount, settled: false })
      setSplitName("")
      setSplitAmount("")
    }
  }

  const toggleSplitSettled = (index: number) => {
    const field = splitFields[index]
    updateSplit(index, { ...field, settled: !field.settled })
  }

  const onSubmit = (data: TransactionFormData) => {
    if (editingTransaction) {
      updateTransaction(editingTransaction.id, data)
    } else {
      addTransaction(data)
    }
    onClose()
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-foreground">
            {editingTransaction ? "Edit Transaction" : "Add Transaction"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {editingTransaction ? "Update the transaction details" : "Record a new income or expense"}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Type Toggle */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Tabs
                      value={field.value}
                      onValueChange={field.onChange}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="expense">Expense</TabsTrigger>
                        <TabsTrigger value="income">Income</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Main fields grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Amount *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          {currencySymbol}
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-8"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? "" : e.target.value)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Category *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              <CategoryIcon name={cat.icon} className="h-4 w-4" />
                              {cat.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Description *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Account */}
              <FormField
                control={form.control}
                name="account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">Account</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            <span className="flex items-center gap-2">
                              <CategoryIcon name={acc.icon} className="h-4 w-4" />
                              {acc.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-foreground">Tags</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Add tags (comma or enter)"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        onBlur={handleAddTag}
                      />
                    </FormControl>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="cursor-pointer text-xs"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag}
                            <X className="ml-1 h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Split Expense Section - only for expenses */}
            {selectedType === "expense" && (
              <Collapsible open={splitOpen} onOpenChange={setSplitOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between text-foreground"
                  >
                    Split Expense
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${splitOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  {/* Existing splits */}
                  {splitFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 rounded-md border border-border p-2"
                    >
                      <span className="flex-1 text-sm text-foreground">{field.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {currencySymbol}{field.amount.toFixed(2)}
                      </span>
                      <Button
                        type="button"
                        variant={field.settled ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleSplitSettled(index)}
                      >
                        {field.settled ? (
                          <><Check className="mr-1 h-3 w-3" /> Settled</>
                        ) : (
                          "Unsettled"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => removeSplit(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  {/* Add new split */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Person name"
                      value={splitName}
                      onChange={(e) => setSplitName(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={splitAmount}
                      onChange={(e) => setSplitAmount(e.target.value)}
                      className="w-28"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSplit}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1">
                {editingTransaction ? "Update Transaction" : "Add Transaction"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
