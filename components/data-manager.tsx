"use client"

import { useState, useRef, useCallback } from "react"
import { useApp } from "@/components/app-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Download, Upload, FileSpreadsheet, FileJson, CheckCircle2, AlertCircle, FileUp } from "lucide-react"

type ImportPreview = {
  type: "json" | "csv"
  filename: string
  counts: Record<string, number>
  rawData: string
}

export function DataManager() {
  const { exportData, importData, importCSV, transactions } = useApp()
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportJSON = () => {
    exportData()
    toast.success("Data exported as JSON")
  }

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.error("No transactions to export")
      return
    }
    const headers = ["date", "type", "amount", "category", "description", "account", "tags"]
    const rows = transactions.map((t) => [
      t.date,
      t.type,
      t.amount.toString(),
      `"${t.category}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.account,
      `"${t.tags.join(";")}"`,
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expense-tracker-transactions-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Transactions exported as CSV")
  }

  const processFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (file.name.endsWith(".json")) {
        try {
          const data = JSON.parse(text)
          const counts: Record<string, number> = {}
          if (Array.isArray(data.transactions)) counts.transactions = data.transactions.length
          if (Array.isArray(data.categories)) counts.categories = data.categories.length
          if (Array.isArray(data.accounts)) counts.accounts = data.accounts.length
          if (Array.isArray(data.budgets)) counts.budgets = data.budgets.length
          if (Array.isArray(data.goals)) counts.goals = data.goals.length
          if (Array.isArray(data.recurring)) counts.recurring = data.recurring.length
          if (data.settings) counts.settings = 1
          setPreview({ type: "json", filename: file.name, counts, rawData: text })
        } catch {
          toast.error("Invalid JSON file")
        }
      } else if (file.name.endsWith(".csv")) {
        const lines = text.trim().split("\n")
        const dataRows = Math.max(0, lines.length - 1)
        setPreview({ type: "csv", filename: file.name, counts: { transactions: dataRows }, rawData: text })
      } else {
        toast.error("Please upload a .json or .csv file")
      }
    }
    reader.readAsText(file)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleConfirmImport = () => {
    if (!preview) return
    if (preview.type === "json") {
      const result = importData(preview.rawData)
      if (result.success) {
        const entries = Object.entries(result.counts || {})
          .map(([k, v]) => `${v} ${k}`)
          .join(", ")
        toast.success(`Imported successfully: ${entries}`)
      } else {
        toast.error(`Import failed: ${result.error}`)
      }
    } else {
      const result = importCSV(preview.rawData)
      if (result.success) {
        toast.success(`Imported ${result.count} transactions from CSV`)
      } else {
        toast.error(`CSV import failed: ${result.error}`)
      }
    }
    setPreview(null)
    setImportDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
          <CardDescription>Download your data as a backup</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" onClick={handleExportJSON}>
            <FileJson className="h-4 w-4" />
            Export as JSON (Full Backup)
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
            Export as CSV (Transactions Only)
          </Button>
        </CardContent>
      </Card>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </CardTitle>
          <CardDescription>Restore from a backup or import transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <FileUp className="h-4 w-4" />
                Import File
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Import Data</DialogTitle>
                <DialogDescription>
                  Upload a JSON backup file or a CSV file with transactions
                </DialogDescription>
              </DialogHeader>

              {!preview ? (
                <div className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    }`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">
                      Drop a file here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports .json and .csv files
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">CSV Format:</p>
                    <p>Headers: date, type, amount, category, description, account, tags</p>
                    <p>Example: 2024-01-15, expense, 25.50, Food, Lunch, cash, &quot;&quot;</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {preview.type === "json" ? (
                        <FileJson className="h-5 w-5 text-primary" />
                      ) : (
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                      )}
                      <span className="text-sm font-medium text-foreground">{preview.filename}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="space-y-1 mt-3">
                      <p className="text-sm font-medium text-foreground">Data to import:</p>
                      {Object.entries(preview.counts).map(([key, count]) => (
                        <div key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          <span>
                            {count} {key}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {preview.type === "json"
                        ? "This will replace your existing data with the imported data."
                        : "Imported transactions will be added to your existing data."}
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter>
                {preview ? (
                  <>
                    <Button variant="outline" onClick={() => setPreview(null)}>
                      Back
                    </Button>
                    <Button onClick={handleConfirmImport}>Confirm Import</Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                    Cancel
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
