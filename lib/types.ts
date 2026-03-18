import { z } from "zod"

// ─── Currency ───────────────────────────────────────────────
export const CurrencySchema = z.object({
  code: z.string(),
  symbol: z.string(),
  name: z.string(),
  locale: z.string(),
})
export type Currency = z.infer<typeof CurrencySchema>

// ─── Split Entry ────────────────────────────────────────────
export const SplitEntrySchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(),
  settled: z.boolean().default(false),
})
export type SplitEntry = z.infer<typeof SplitEntrySchema>

// ─── Transaction (replaces Expense) ────────────────────────
export const TransactionSchema = z.object({
  id: z.string(),
  type: z.enum(["expense", "income"]),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account: z.string().default("cash"),
  tags: z.array(z.string()).default([]),
  attachments: z.array(z.string()).default([]),
  recurringId: z.string().optional(),
  splitWith: z.array(SplitEntrySchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Transaction = z.infer<typeof TransactionSchema>

// ─── Legacy Expense (for migration) ────────────────────────
export const LegacyExpenseSchema = z.object({
  id: z.string(),
  amount: z.number(),
  category: z.string(),
  description: z.string(),
  date: z.string(),
  createdAt: z.string(),
})
export type LegacyExpense = z.infer<typeof LegacyExpenseSchema>

// ─── Category ───────────────────────────────────────────────
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  icon: z.string(),
  type: z.enum(["expense", "income", "both"]),
  isDefault: z.boolean().default(false),
})
export type Category = z.infer<typeof CategorySchema>

// ─── Account ────────────────────────────────────────────────
export const AccountSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(["cash", "bank", "credit-card", "wallet", "investment"]),
  icon: z.string(),
  color: z.string(),
  initialBalance: z.number().default(0),
  createdAt: z.string(),
})
export type Account = z.infer<typeof AccountSchema>

// ─── Budget ─────────────────────────────────────────────────
export const BudgetSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  amount: z.number().positive(),
  period: z.enum(["monthly", "weekly", "yearly"]).default("monthly"),
  createdAt: z.string(),
})
export type Budget = z.infer<typeof BudgetSchema>

// ─── Savings Goal ───────────────────────────────────────────
export const SavingsGoalSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  savedAmount: z.number().min(0).default(0),
  deadline: z.string().optional(),
  icon: z.string().default("Target"),
  color: z.string().default("#4ECDC4"),
  createdAt: z.string(),
})
export type SavingsGoal = z.infer<typeof SavingsGoalSchema>

// ─── Recurring Rule ─────────────────────────────────────────
export const RecurringRuleSchema = z.object({
  id: z.string(),
  type: z.enum(["expense", "income"]),
  amount: z.number().positive(),
  category: z.string(),
  description: z.string(),
  account: z.string().default("cash"),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  startDate: z.string(),
  endDate: z.string().optional(),
  lastProcessed: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
})
export type RecurringRule = z.infer<typeof RecurringRuleSchema>

// ─── App Settings ───────────────────────────────────────────
export const AppSettingsSchema = z.object({
  currency: CurrencySchema,
  pin: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  notifications: z.boolean().default(false),
  onboardingCompleted: z.boolean().default(false),
})
export type AppSettings = z.infer<typeof AppSettingsSchema>

// ─── Form schemas (for React Hook Form) ─────────────────────
export const TransactionFormSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  account: z.string().min(1, "Account is required"),
  tags: z.array(z.string()).default([]),
  splitWith: z.array(SplitEntrySchema).default([]),
})
export type TransactionFormData = z.infer<typeof TransactionFormSchema>

export const BudgetFormSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  period: z.enum(["monthly", "weekly", "yearly"]).default("monthly"),
})
export type BudgetFormData = z.infer<typeof BudgetFormSchema>

export const GoalFormSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  targetAmount: z.coerce.number().positive("Target must be greater than 0"),
  deadline: z.string().optional(),
  icon: z.string().default("Target"),
  color: z.string().default("#4ECDC4"),
})
export type GoalFormData = z.infer<typeof GoalFormSchema>

export const AccountFormSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  type: z.enum(["cash", "bank", "credit-card", "wallet", "investment"]),
  icon: z.string(),
  color: z.string(),
  initialBalance: z.coerce.number().default(0),
})
export type AccountFormData = z.infer<typeof AccountFormSchema>

export const RecurringFormSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  account: z.string().default("cash"),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
})
export type RecurringFormData = z.infer<typeof RecurringFormSchema>

export const CategoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  icon: z.string().min(1, "Icon is required"),
  type: z.enum(["expense", "income", "both"]),
})
export type CategoryFormData = z.infer<typeof CategoryFormSchema>
