"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { X, Plus, ChevronDown, Users, Divide } from "lucide-react"
import type { SplitEntry, Currency } from "@/lib/types"
import { formatCurrency } from "@/utils/currency"

interface SplitExpenseProps {
  splits: SplitEntry[]
  onChange: (splits: SplitEntry[]) => void
  totalAmount: number
  currency: Currency
}

export function SplitExpense({
  splits,
  onChange,
  totalAmount,
  currency,
}: SplitExpenseProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newAmount, setNewAmount] = useState("")

  const splitsTotal = splits.reduce((sum, s) => sum + s.amount, 0)
  const remaining = totalAmount - splitsTotal
  const settledCount = splits.filter((s) => s.settled).length
  const exceeds = splitsTotal > totalAmount

  function handleAdd() {
    const trimmedName = newName.trim()
    const parsedAmount = parseFloat(newAmount)
    if (!trimmedName || isNaN(parsedAmount) || parsedAmount <= 0) return

    onChange([
      ...splits,
      { name: trimmedName, amount: parsedAmount, settled: false },
    ])
    setNewName("")
    setNewAmount("")
  }

  function handleRemove(index: number) {
    onChange(splits.filter((_, i) => i !== index))
  }

  function handleSettledChange(index: number, checked: boolean) {
    const updated = splits.map((s, i) =>
      i === index ? { ...s, settled: checked } : s
    )
    onChange(updated)
  }

  function handleAutoSplit() {
    if (splits.length === 0) return
    const perPerson = Math.round((totalAmount / splits.length) * 100) / 100
    const updated = splits.map((s, i) => ({
      ...s,
      amount:
        i === splits.length - 1
          ? Math.round((totalAmount - perPerson * (splits.length - 1)) * 100) /
            100
          : perPerson,
    }))
    onChange(updated)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto text-zinc-300 hover:text-white hover:bg-zinc-800"
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-medium">Split Expense</span>
            {splits.length > 0 && (
              <span className="text-xs text-zinc-500">
                ({splits.length} {splits.length === 1 ? "person" : "people"})
              </span>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {/* Existing split entries */}
        {splits.length > 0 && (
          <div className="space-y-2">
            {splits.map((split, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-md bg-zinc-800/50 px-3 py-2"
              >
                <Checkbox
                  checked={split.settled}
                  onCheckedChange={(checked) =>
                    handleSettledChange(index, checked === true)
                  }
                  className="border-zinc-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                />
                <span
                  className={`flex-1 text-sm ${
                    split.settled
                      ? "text-zinc-500 line-through"
                      : "text-zinc-200"
                  }`}
                >
                  {split.name}
                </span>
                <span
                  className={`text-sm font-medium ${
                    split.settled ? "text-zinc-500" : "text-zinc-300"
                  }`}
                >
                  {formatCurrency(split.amount, currency)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-transparent"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add person row */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAdd()
              }
            }}
            className="flex-1 h-8 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
          />
          <Input
            type="number"
            placeholder="Amount"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleAdd()
              }
            }}
            className="w-24 h-8 bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
            min={0}
            step="0.01"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            onClick={handleAdd}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>

        {/* Auto-split button */}
        {splits.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            onClick={handleAutoSplit}
          >
            <Divide className="h-3.5 w-3.5 mr-1.5" />
            Split equally ({formatCurrency(totalAmount / splits.length, currency)} each)
          </Button>
        )}

        {/* Remaining / validation */}
        {splits.length > 0 && (
          <div className="space-y-1 border-t border-zinc-800 pt-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Remaining</span>
              <span
                className={
                  exceeds
                    ? "text-red-400 font-medium"
                    : remaining === 0
                    ? "text-emerald-400 font-medium"
                    : "text-zinc-300"
                }
              >
                {exceeds
                  ? `Exceeds by ${formatCurrency(Math.abs(remaining), currency)}`
                  : formatCurrency(remaining, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Settled</span>
              <span className="text-zinc-400">
                {settledCount} of {splits.length}{" "}
                {splits.length === 1 ? "person" : "people"} settled
                {settledCount < splits.length && (
                  <>
                    {", "}
                    <span className="text-amber-400">
                      {formatCurrency(
                        splits
                          .filter((s) => !s.settled)
                          .reduce((sum, s) => sum + s.amount, 0),
                        currency
                      )}{" "}
                      remaining
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
