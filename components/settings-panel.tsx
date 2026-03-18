"use client"

import { useState } from "react"
import { useApp } from "@/components/app-provider"
import { CURRENCIES } from "@/lib/constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { toast } from "sonner"
import { Download, Upload, FileSpreadsheet, Trash2, Sun, Moon, Monitor, Lock, LockOpen, Info } from "lucide-react"

export function SettingsPanel() {
  const { settings, updateSettings, exportData, importData, importCSV, clearAllData } = useApp()
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pinValue, setPinValue] = useState("")
  const [pinConfirmValue, setPinConfirmValue] = useState("")
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter")

  const handleCurrencyChange = (code: string) => {
    const currency = CURRENCIES.find((c) => c.code === code)
    if (currency) {
      updateSettings({ currency })
      toast.success(`Currency changed to ${currency.name}`)
    }
  }

  const handleThemeChange = (theme: "light" | "dark" | "system") => {
    updateSettings({ theme })
    toast.success(`Theme set to ${theme}`)
  }

  const handleNotificationsToggle = (enabled: boolean) => {
    updateSettings({ notifications: enabled })
    toast.success(enabled ? "Notifications enabled" : "Notifications disabled")
  }

  const handlePinToggle = (enabled: boolean) => {
    if (enabled) {
      setPinValue("")
      setPinConfirmValue("")
      setPinStep("enter")
      setPinDialogOpen(true)
    } else {
      updateSettings({ pin: undefined })
      sessionStorage.removeItem("et_unlocked")
      toast.success("PIN lock disabled")
    }
  }

  const handlePinSetup = () => {
    if (pinStep === "enter") {
      if (pinValue.length !== 4) {
        toast.error("Please enter a 4-digit PIN")
        return
      }
      setPinStep("confirm")
      setPinConfirmValue("")
    } else {
      if (pinConfirmValue !== pinValue) {
        toast.error("PINs do not match. Please try again.")
        setPinStep("enter")
        setPinValue("")
        setPinConfirmValue("")
        return
      }
      updateSettings({ pin: btoa(pinValue) })
      sessionStorage.setItem("et_unlocked", "true")
      setPinDialogOpen(false)
      toast.success("PIN lock enabled")
    }
  }

  const handleImportJSON = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        const result = importData(text)
        if (result.success) {
          const entries = Object.entries(result.counts || {})
            .map(([k, v]) => `${v} ${k}`)
            .join(", ")
          toast.success(`Data imported successfully: ${entries}`)
        } else {
          toast.error(`Import failed: ${result.error}`)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleImportCSV = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".csv"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        const result = importCSV(text)
        if (result.success) {
          toast.success(`Imported ${result.count} transactions from CSV`)
        } else {
          toast.error(`CSV import failed: ${result.error}`)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleClearData = () => {
    clearAllData()
    toast.success("All data cleared successfully")
  }

  return (
    <div className="space-y-6">
      {/* Currency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Currency</CardTitle>
          <CardDescription>Choose your preferred currency for tracking expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={settings.currency.code} onValueChange={handleCurrencyChange}>
            <SelectTrigger className="w-full sm:w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-base">{c.symbol}</span>
                    <span>{c.name}</span>
                    <span className="text-muted-foreground">({c.code})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the app</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {[
              { value: "light" as const, label: "Light", icon: Sun },
              { value: "dark" as const, label: "Dark", icon: Moon },
              { value: "system" as const, label: "System", icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleThemeChange(value)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-3 transition-colors ${
                  settings.theme === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications & Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferences</CardTitle>
          <CardDescription>Notifications and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Notifications</Label>
              <p className="text-sm text-muted-foreground">Get reminders for recurring expenses and budgets</p>
            </div>
            <Switch checked={settings.notifications} onCheckedChange={handleNotificationsToggle} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                {settings.pin ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                PIN Lock
              </Label>
              <p className="text-sm text-muted-foreground">Require a PIN to access the app</p>
            </div>
            <Switch checked={!!settings.pin} onCheckedChange={handlePinToggle} />
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Management</CardTitle>
          <CardDescription>Export, import, or clear your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start gap-2" onClick={exportData}>
              <Download className="h-4 w-4" />
              Export as JSON
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={handleImportJSON}>
              <Upload className="h-4 w-4" />
              Import JSON
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={handleImportCSV}>
              <FileSpreadsheet className="h-4 w-4" />
              Import CSV
            </Button>
          </div>
          <Separator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your data including transactions, categories, accounts, budgets,
                  goals, and settings. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-4 w-4" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <p className="text-foreground font-medium">Expense Tracker</p>
            <p className="text-muted-foreground">Version 2.0.0</p>
            <p className="text-muted-foreground">A simple, privacy-first expense tracker. All data is stored locally in your browser.</p>
          </div>
        </CardContent>
      </Card>

      {/* PIN Setup Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>{pinStep === "enter" ? "Set up PIN" : "Confirm PIN"}</DialogTitle>
            <DialogDescription>
              {pinStep === "enter"
                ? "Enter a 4-digit PIN to lock your app"
                : "Enter the same PIN again to confirm"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <InputOTP
              maxLength={4}
              value={pinStep === "enter" ? pinValue : pinConfirmValue}
              onChange={(val) => pinStep === "enter" ? setPinValue(val) : setPinConfirmValue(val)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePinSetup}>
              {pinStep === "enter" ? "Next" : "Set PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
