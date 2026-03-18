"use client"

import { useState } from "react"
import { useApp } from "@/components/app-provider"
import { CURRENCIES } from "@/lib/constants"
import { CategoryIcon } from "@/components/category-icon"
import type { Currency } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  Wallet,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  CircleDollarSign,
  LayoutGrid,
  PartyPopper,
} from "lucide-react"

interface OnboardingProps {
  children: React.ReactNode
}

const STEPS = ["Welcome", "Currency", "Accounts", "Categories", "Done"] as const
type Step = (typeof STEPS)[number]

export function Onboarding({ children }: OnboardingProps) {
  const { settings, updateSettings, categories, accounts, updateAccount, loaded } = useApp()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(settings.currency)
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({})

  if (!loaded) return null
  if (settings.onboardingCompleted) return <>{children}</>

  const step = STEPS[currentStep]

  const handleNext = () => {
    if (currentStep === 1) {
      // Save currency selection
      updateSettings({ currency: selectedCurrency })
    }
    if (currentStep === 2) {
      // Save account balances
      Object.entries(accountBalances).forEach(([id, balance]) => {
        const account = accounts.find((a) => a.id === id)
        if (account) {
          updateAccount(id, {
            name: account.name,
            type: account.type,
            icon: account.icon,
            color: account.color,
            initialBalance: balance,
          })
        }
      })
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleComplete = () => {
    updateSettings({ onboardingCompleted: true })
  }

  const expenseCategories = categories.filter((c) => c.type === "expense" || c.type === "both")
  const incomeCategories = categories.filter((c) => c.type === "income" || c.type === "both")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-full max-w-lg mx-4">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === currentStep
                  ? "w-8 bg-primary"
                  : i < currentStep
                    ? "w-2 bg-primary/60"
                    : "w-2 bg-muted"
              )}
            />
          ))}
        </div>

        <Card className="border-border">
          <CardContent className="p-6 sm:p-8">
            {/* Step 1: Welcome */}
            {step === "Welcome" && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-6 transition-transform duration-500 hover:scale-110">
                    <Wallet className="h-12 w-12 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    Welcome to Expense Tracker
                  </h1>
                  <p className="text-muted-foreground">
                    Take control of your finances. Track expenses, set budgets, and achieve your savings goals
                    -- all from your browser with complete privacy.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { icon: CircleDollarSign, label: "Track Spending" },
                    { icon: LayoutGrid, label: "Set Budgets" },
                    { icon: Sparkles, label: "Save Smarter" },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 p-3"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground font-medium">{label}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full gap-2" size="lg" onClick={handleNext}>
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Currency */}
            {step === "Currency" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-foreground">Choose Your Currency</h2>
                  <p className="text-sm text-muted-foreground">
                    Select the currency you use for everyday transactions
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {CURRENCIES.map((currency) => (
                    <button
                      key={currency.code}
                      onClick={() => setSelectedCurrency(currency)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                        selectedCurrency.code === currency.code
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border bg-card hover:bg-accent"
                      )}
                    >
                      <span className="text-2xl font-mono">{currency.symbol}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {currency.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{currency.code}</p>
                      </div>
                      {selectedCurrency.code === currency.code && (
                        <Check className="h-4 w-4 text-primary ml-auto shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Accounts */}
            {step === "Accounts" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-foreground">Set Up Your Accounts</h2>
                  <p className="text-sm text-muted-foreground">
                    Set initial balances for your accounts (you can change these later)
                  </p>
                </div>
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                        style={{ backgroundColor: account.color + "20" }}
                      >
                        <CategoryIcon
                          name={account.icon}
                          className="h-5 w-5"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{account.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{account.type}</p>
                      </div>
                      <div className="w-32 shrink-0">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            {selectedCurrency.symbol}
                          </span>
                          <Input
                            type="number"
                            placeholder="0"
                            className="pl-8 text-right"
                            value={accountBalances[account.id] ?? account.initialBalance ?? ""}
                            onChange={(e) =>
                              setAccountBalances((prev) => ({
                                ...prev,
                                [account.id]: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Categories */}
            {step === "Categories" && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-foreground">Review Categories</h2>
                  <p className="text-sm text-muted-foreground">
                    These default categories are ready to use. You can add custom ones later in settings.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      Expense Categories
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {expenseCategories.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"
                        >
                          <CategoryIcon name={cat.icon} className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-foreground">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium text-foreground mb-2 block">
                      Income Categories
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {incomeCategories.map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"
                        >
                          <CategoryIcon name={cat.icon} className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-foreground">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Done */}
            {step === "Done" && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="rounded-full bg-green-500/10 p-6 transition-transform duration-500 hover:scale-110">
                      <PartyPopper className="h-12 w-12 text-green-500" />
                    </div>
                    {/* Decorative sparkles */}
                    <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
                    <div className="absolute -bottom-1 -left-2 h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
                    <div className="absolute top-0 -left-3 h-2.5 w-2.5 rounded-full bg-pink-400 animate-pulse delay-300" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">You&apos;re All Set!</h2>
                  <p className="text-muted-foreground">
                    Everything is configured and ready to go. Start tracking your expenses and take control of
                    your finances.
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium text-foreground">Currency:</span>{" "}
                    {settings.currency.symbol} {settings.currency.name}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Accounts:</span>{" "}
                    {accounts.length} accounts set up
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Categories:</span>{" "}
                    {categories.length} categories ready
                  </p>
                </div>
                <Button className="w-full gap-2" size="lg" onClick={handleComplete}>
                  <Sparkles className="h-4 w-4" />
                  Start Tracking
                </Button>
              </div>
            )}

            {/* Navigation (not shown on Welcome and Done steps) */}
            {step !== "Welcome" && step !== "Done" && (
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
                <Button variant="ghost" onClick={handleBack} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <span className="text-xs text-muted-foreground">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
                <Button onClick={handleNext} className="gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
