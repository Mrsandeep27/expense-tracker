"use client"

import { useState, useCallback, useRef, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/components/app-provider"
import { CategoryIcon } from "@/components/category-icon"
import { parseBankStatement, detectBankFormat, SUPPORTED_BANKS } from "@/lib/bank-parsers"
import { autoCategorize, autoDetectType } from "@/lib/auto-categorize"
import { formatCurrency } from "@/utils/currency"
import type { TransactionFormData } from "@/lib/types"

// ─── Types ──────────────────────────────────────────────────────
interface BankImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ParsedTransaction {
  date: string
  description: string
  amount: number
  type: "expense" | "income"
  category: string
  confidence: number
  selected: boolean
}

interface ImportResults {
  expenseCount: number
  incomeCount: number
  totalAmount: number
  categoryBreakdown: Record<string, { count: number; amount: number }>
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const COUNTRY_FLAGS: Record<string, string> = {
  India: "\u{1F1EE}\u{1F1F3}",
  US: "\u{1F1FA}\u{1F1F8}",
  USA: "\u{1F1FA}\u{1F1F8}",
}
const PREVIEW_LIMIT = 20

// ─── Component ──────────────────────────────────────────────────
export function BankImport({ open, onOpenChange }: BankImportProps) {
  const { categories, accounts, settings, addTransaction } = useApp()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [dragOver, setDragOver] = useState(false)
  const [pasteContent, setPasteContent] = useState("")
  const [parsing, setParsing] = useState(false)
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null)
  const [parsedTransactions, setParsedTransactions] = useState<ParsedTransaction[]>([])
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id ?? "cash")
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [results, setResults] = useState<ImportResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Derived state ─────────────────────────────────────────
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense" || c.type === "both"),
    [categories]
  )
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "income" || c.type === "both"),
    [categories]
  )

  const selectedCount = parsedTransactions.filter((t) => t.selected).length
  const allSelected =
    parsedTransactions.length > 0 && parsedTransactions.every((t) => t.selected)

  const summary = useMemo(() => {
    if (parsedTransactions.length === 0) return null
    const dates = parsedTransactions.map((t) => t.date).sort()
    const debits = parsedTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)
    const credits = parsedTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)
    return {
      total: parsedTransactions.length,
      dateFrom: dates[0],
      dateTo: dates[dates.length - 1],
      debits,
      credits,
    }
  }, [parsedTransactions])

  // ── Helpers ───────────────────────────────────────────────
  const resetState = useCallback(() => {
    setStep(1)
    setDragOver(false)
    setPasteContent("")
    setParsing(false)
    setDetectedFormat(null)
    setParsedTransactions([])
    setSelectedAccount(accounts[0]?.id ?? "cash")
    setImporting(false)
    setImportProgress(0)
    setResults(null)
    setError(null)
  }, [accounts])

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) resetState()
      onOpenChange(value)
    },
    [onOpenChange, resetState]
  )

  const processContent = useCallback(
    async (content: string, fileName?: string) => {
      setParsing(true)
      setError(null)

      try {
        const format = detectBankFormat(content)
        setDetectedFormat(format)

        const parseResult = parseBankStatement(content, format)

        if (!parseResult.success || parseResult.transactions.length === 0) {
          setError(parseResult.error || "No transactions found in the file. Please check the format.")
          setParsing(false)
          return
        }

        const processed: ParsedTransaction[] = parseResult.transactions.map(
          (raw) => {
            const type = raw.type === "credit" ? "income" as const : "expense" as const
            const { category, confidence } = autoCategorize(raw.description, raw.amount, type)
            return {
              date: raw.date,
              description: raw.description,
              amount: Math.abs(raw.amount),
              type,
              category,
              confidence,
              selected: true,
            }
          }
        )

        setParsedTransactions(processed)
        setStep(2)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse file"
        setError(message)
        toast.error("Parse Error", { description: message })
      } finally {
        setParsing(false)
      }
    },
    [categories]
  )

  // ── File handling ─────────────────────────────────────────
  const handleFile = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large", {
          description: "Maximum file size is 5MB",
        })
        return
      }

      const ext = file.name.split(".").pop()?.toLowerCase()
      if (!["csv", "txt", "xls"].includes(ext ?? "")) {
        toast.error("Unsupported file type", {
          description: "Please upload a .csv, .txt, or .xls file",
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        if (content) processContent(content, file.name)
      }
      reader.onerror = () => {
        toast.error("Failed to read file")
      }
      reader.readAsText(file)
    },
    [processContent]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handlePaste = useCallback(() => {
    if (!pasteContent.trim()) {
      toast.error("No content", { description: "Please paste your bank statement first" })
      return
    }
    processContent(pasteContent.trim())
  }, [pasteContent, processContent])

  // ── Selection ─────────────────────────────────────────────
  const toggleAll = useCallback(() => {
    setParsedTransactions((prev) => {
      const newState = !prev.every((t) => t.selected)
      return prev.map((t) => ({ ...t, selected: newState }))
    })
  }, [])

  const toggleOne = useCallback((index: number) => {
    setParsedTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    )
  }, [])

  const updateCategory = useCallback((index: number, category: string) => {
    setParsedTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, category, confidence: 1 } : t))
    )
  }, [])

  // ── Import ────────────────────────────────────────────────
  const handleImport = useCallback(async () => {
    const selected = parsedTransactions.filter((t) => t.selected)
    if (selected.length === 0) {
      toast.error("No transactions selected")
      return
    }

    setImporting(true)
    setImportProgress(0)

    let expenseCount = 0
    let incomeCount = 0
    let totalAmount = 0
    const categoryBreakdown: Record<string, { count: number; amount: number }> = {}

    try {
      for (let i = 0; i < selected.length; i++) {
        const tx = selected[i]

        const formData: TransactionFormData = {
          type: tx.type,
          amount: tx.amount,
          category: tx.category,
          description: tx.description,
          date: tx.date,
          account: selectedAccount,
          tags: ["bank-import"],
          splitWith: [],
        }

        addTransaction(formData)

        // Track results
        if (tx.type === "expense") expenseCount++
        else incomeCount++
        totalAmount += tx.amount

        if (!categoryBreakdown[tx.category]) {
          categoryBreakdown[tx.category] = { count: 0, amount: 0 }
        }
        categoryBreakdown[tx.category].count++
        categoryBreakdown[tx.category].amount += tx.amount

        // Update progress
        setImportProgress(Math.round(((i + 1) / selected.length) * 100))

        // Yield to UI every 10 transactions
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
      }

      setResults({ expenseCount, incomeCount, totalAmount, categoryBreakdown })
      setStep(3)
      toast.success(`${selected.length} transactions imported successfully`)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed"
      toast.error("Import Error", { description: message })
    } finally {
      setImporting(false)
    }
  }, [parsedTransactions, selectedAccount, addTransaction])

  // ── Confidence badge ──────────────────────────────────────
  const ConfidenceDot = ({ value }: { value: number }) => {
    const color =
      value > 0.7
        ? "bg-green-500"
        : value > 0.3
          ? "bg-yellow-500"
          : "bg-red-500"
    const label =
      value > 0.7 ? "High" : value > 0.3 ? "Medium" : "Low"
    return (
      <div className="flex items-center gap-1.5">
        <div className={`h-2 w-2 rounded-full ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    )
  }

  // ── Truncate ──────────────────────────────────────────────
  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + "..." : text

  // ── Category options for a given type ─────────────────────
  const getCategoriesForType = (type: "expense" | "income") =>
    type === "expense" ? expenseCategories : incomeCategories

  // ── Find category name ────────────────────────────────────
  const getCategoryName = (id: string) => {
    const cat = categories.find((c) => c.id === id)
    return cat?.name ?? id
  }

  const getCategoryIcon = (id: string) => {
    const cat = categories.find((c) => c.id === id)
    return cat?.icon ?? "Circle"
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold">
            Import Bank Statement
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {step === 1 && "Upload or paste your bank statement to import transactions"}
            {step === 2 && "Review and categorize transactions before importing"}
            {step === 3 && "Import complete"}
          </DialogDescription>
          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    s === step
                      ? "bg-primary text-primary-foreground"
                      : s < step
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-0.5 w-8 rounded ${
                      s < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* ────────────────────────────────────────────────── */}
            {/* STEP 1: Upload                                    */}
            {/* ────────────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all cursor-pointer ${
                    dragOver
                      ? "border-primary bg-primary/5 scale-[1.01]"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  {parsing ? (
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  ) : (
                    <Upload className="h-12 w-12 text-muted-foreground" />
                  )}
                  <div className="text-center">
                    <p className="text-base font-medium text-foreground">
                      {parsing ? "Parsing file..." : "Drop your bank statement here"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or click to browse. Supports .csv, .txt, .xls (max 5MB)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>

                {/* Paste area */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Or paste your bank statement
                  </p>
                  <Textarea
                    placeholder="Paste CSV content here..."
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    className="min-h-[120px] font-mono text-xs"
                  />
                  {pasteContent.trim() && (
                    <Button onClick={handlePaste} disabled={parsing} className="w-full sm:w-auto">
                      {parsing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Parse Statement
                    </Button>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Supported banks */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Supported banks
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUPPORTED_BANKS.map((bank) => (
                      <Badge
                        key={bank.id}
                        variant="secondary"
                        className="text-xs py-1 px-2.5"
                      >
                        <span className="mr-1.5">{COUNTRY_FLAGS[bank.country] ?? ""}</span>
                        {bank.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ────────────────────────────────────────────────── */}
            {/* STEP 2: Preview & Categorize                      */}
            {/* ────────────────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                {/* Detected format */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  {detectedFormat ? (
                    <Badge variant="secondary" className="text-sm py-1 px-3">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                      Detected: {detectedFormat}
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Format:</span>
                      <Select
                        value={detectedFormat ?? ""}
                        onValueChange={(v) => setDetectedFormat(v)}
                      >
                        <SelectTrigger className="w-[200px] h-8">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_BANKS.map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              {COUNTRY_FLAGS[bank.country] ?? ""} {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Account selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Import to:
                    </span>
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Summary bar */}
                {summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Transactions</p>
                      <p className="text-lg font-semibold">{summary.total}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Date Range</p>
                      <p className="text-sm font-medium">
                        {summary.dateFrom} - {summary.dateTo}
                      </p>
                    </div>
                    <div className="rounded-lg bg-red-500/10 p-3">
                      <p className="text-xs text-muted-foreground">Total Debits</p>
                      <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(summary.debits, settings.currency)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-green-500/10 p-3">
                      <p className="text-xs text-muted-foreground">Total Credits</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(summary.credits, settings.currency)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Transaction table (desktop) */}
                <div className="hidden md:block rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                        <TableHead className="w-24">Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-20">Type</TableHead>
                        <TableHead className="w-28 text-right">Amount</TableHead>
                        <TableHead className="w-44">Category</TableHead>
                        <TableHead className="w-20">Conf.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedTransactions.slice(0, PREVIEW_LIMIT).map((tx, i) => (
                        <TableRow
                          key={i}
                          className={`${
                            i % 2 === 0 ? "bg-background" : "bg-muted/30"
                          } ${!tx.selected ? "opacity-50" : ""}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={tx.selected}
                              onCheckedChange={() => toggleOne(i)}
                            />
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {tx.date}
                          </TableCell>
                          <TableCell
                            className="text-sm max-w-[200px]"
                            title={tx.description}
                          >
                            {truncate(tx.description, 50)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={tx.type === "expense" ? "destructive" : "default"}
                              className="text-[10px] px-1.5"
                            >
                              {tx.type === "expense" ? "Debit" : "Credit"}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-right text-sm font-medium ${
                              tx.type === "expense"
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {tx.type === "expense" ? "-" : "+"}
                            {formatCurrency(tx.amount, settings.currency)}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={tx.category}
                              onValueChange={(v) => updateCategory(i, v)}
                            >
                              <SelectTrigger className="h-7 text-xs w-full">
                                <div className="flex items-center gap-1.5 truncate">
                                  <CategoryIcon
                                    name={getCategoryIcon(tx.category)}
                                    className="h-3 w-3 shrink-0"
                                  />
                                  <span className="truncate">
                                    {getCategoryName(tx.category)}
                                  </span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {getCategoriesForType(tx.type).map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-2">
                                      <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
                                      {cat.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <ConfidenceDot value={tx.confidence} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parsedTransactions.length > PREVIEW_LIMIT && (
                    <div className="border-t px-4 py-2 text-xs text-muted-foreground bg-muted/30">
                      Showing {PREVIEW_LIMIT} of {parsedTransactions.length} transactions
                    </div>
                  )}
                </div>

                {/* Transaction cards (mobile) */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-center gap-2 pb-1">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    <span className="text-sm text-muted-foreground">Select All</span>
                  </div>
                  {parsedTransactions.slice(0, PREVIEW_LIMIT).map((tx, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 space-y-2 transition-opacity ${
                        !tx.selected ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Checkbox
                            checked={tx.selected}
                            onCheckedChange={() => toggleOne(i)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {truncate(tx.description, 40)}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {tx.date}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-semibold ${
                              tx.type === "expense"
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {tx.type === "expense" ? "-" : "+"}
                            {formatCurrency(tx.amount, settings.currency)}
                          </p>
                          <Badge
                            variant={tx.type === "expense" ? "destructive" : "default"}
                            className="text-[10px] px-1.5 mt-0.5"
                          >
                            {tx.type === "expense" ? "Debit" : "Credit"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Select
                          value={tx.category}
                          onValueChange={(v) => updateCategory(i, v)}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <CategoryIcon
                                name={getCategoryIcon(tx.category)}
                                className="h-3 w-3 shrink-0"
                              />
                              <span className="truncate">
                                {getCategoryName(tx.category)}
                              </span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {getCategoriesForType(tx.type).map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
                                  {cat.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <ConfidenceDot value={tx.confidence} />
                      </div>
                    </div>
                  ))}
                  {parsedTransactions.length > PREVIEW_LIMIT && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      Showing {PREVIEW_LIMIT} of {parsedTransactions.length} transactions
                    </p>
                  )}
                </div>

                {/* Import progress */}
                {importing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Importing transactions...</span>
                      <span className="font-medium">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}
              </div>
            )}

            {/* ────────────────────────────────────────────────── */}
            {/* STEP 3: Results                                    */}
            {/* ────────────────────────────────────────────────── */}
            {step === 3 && results && (
              <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
                {/* Success header */}
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">
                      Import Successful
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {results.expenseCount + results.incomeCount} transactions have been imported
                    </p>
                  </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {results.expenseCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Expenses Imported</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {results.incomeCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Income Imported</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(results.totalAmount, settings.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total Amount</p>
                  </div>
                </div>

                {/* Category breakdown */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Category Breakdown</h4>
                  <div className="rounded-lg border divide-y">
                    {Object.entries(results.categoryBreakdown)
                      .sort(([, a], [, b]) => b.amount - a.amount)
                      .map(([catId, data]) => (
                        <div
                          key={catId}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <div className="flex items-center gap-2.5">
                            <CategoryIcon
                              name={getCategoryIcon(catId)}
                              className="h-4 w-4 text-muted-foreground"
                            />
                            <span className="text-sm">{getCategoryName(catId)}</span>
                            <Badge variant="secondary" className="text-[10px]">
                              {data.count}
                            </Badge>
                          </div>
                          <span className="text-sm font-medium">
                            {formatCurrency(data.amount, settings.currency)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Parsing skeleton */}
            {parsing && step === 1 && (
              <div className="space-y-3 mt-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="border-t px-6 py-4 flex items-center justify-between gap-3">
          {step === 1 && (
            <div className="flex-1" />
          )}

          {step === 2 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStep(1)
                  setParsedTransactions([])
                  setDetectedFormat(null)
                  setError(null)
                }}
                disabled={importing}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
                size="sm"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-1.5" />
                )}
                Import Selected ({selectedCount} transactions)
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <div className="flex-1" />
              <Button onClick={() => handleOpenChange(false)} size="sm">
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
