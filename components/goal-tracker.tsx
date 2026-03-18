"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useApp } from "@/components/app-provider"
import { GoalFormSchema, type GoalFormData, type SavingsGoal } from "@/lib/types"
import { formatCurrency } from "@/utils/currency"
import { CategoryIcon } from "@/components/category-icon"
import { GOAL_ICONS, GOAL_COLORS } from "@/lib/constants"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Plus, Pencil, Trash2, Target, Trophy, PlusCircle } from "lucide-react"
import { z } from "zod"

const ContributeSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
})
type ContributeFormData = z.infer<typeof ContributeSchema>

export function GoalTracker() {
  const {
    goals,
    settings,
    addGoal,
    updateGoal,
    deleteGoal,
    contributeToGoal,
    loaded,
  } = useApp()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [contributeDialogOpen, setContributeDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(
    null
  )

  const form = useForm<GoalFormData>({
    resolver: zodResolver(GoalFormSchema),
    defaultValues: {
      name: "",
      targetAmount: 0,
      deadline: "",
      icon: "Target",
      color: "#4ECDC4",
    },
  })

  const contributeForm = useForm<ContributeFormData>({
    resolver: zodResolver(ContributeSchema),
    defaultValues: { amount: 0 },
  })

  function openAddDialog() {
    setEditingGoal(null)
    form.reset({
      name: "",
      targetAmount: 0,
      deadline: "",
      icon: "Target",
      color: "#4ECDC4",
    })
    setDialogOpen(true)
  }

  function openEditDialog(goal: SavingsGoal) {
    setEditingGoal(goal)
    form.reset({
      name: goal.name,
      targetAmount: goal.targetAmount,
      deadline: goal.deadline || "",
      icon: goal.icon,
      color: goal.color,
    })
    setDialogOpen(true)
  }

  function openContributeDialog(goalId: string) {
    setContributingGoalId(goalId)
    contributeForm.reset({ amount: 0 })
    setContributeDialogOpen(true)
  }

  function onSubmit(data: GoalFormData) {
    const cleaned = {
      ...data,
      deadline: data.deadline || undefined,
    }
    if (editingGoal) {
      updateGoal(editingGoal.id, cleaned)
    } else {
      addGoal(cleaned)
    }
    setDialogOpen(false)
    setEditingGoal(null)
    form.reset()
  }

  function onContribute(data: ContributeFormData) {
    if (contributingGoalId) {
      contributeToGoal(contributingGoalId, data.amount)
    }
    setContributeDialogOpen(false)
    setContributingGoalId(null)
    contributeForm.reset()
  }

  function getDaysRemaining(deadline: string | undefined): number | null {
    if (!deadline) return null
    const now = new Date()
    const target = new Date(deadline)
    const diff = target.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
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
          <h2 className="text-2xl font-bold text-foreground">Savings Goals</h2>
          <p className="text-sm text-muted-foreground">
            Track your progress towards financial goals
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingGoal ? "Edit Goal" : "Add Goal"}
              </DialogTitle>
              <DialogDescription>
                {editingGoal
                  ? "Update your savings goal."
                  : "Set a new savings target to work towards."}
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
                      <FormLabel>Goal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. New Car" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="targetAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Amount</FormLabel>
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
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline (optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <div className="grid grid-cols-5 gap-2">
                        {GOAL_ICONS.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            className={`flex h-10 w-full items-center justify-center rounded-md border-2 transition-colors ${
                              field.value === icon
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-muted-foreground"
                            }`}
                            onClick={() => field.onChange(icon)}
                          >
                            <CategoryIcon name={icon} className="h-5 w-5" />
                          </button>
                        ))}
                      </div>
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
                        {GOAL_COLORS.map((color) => (
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
                    {editingGoal ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contribute Dialog */}
      <Dialog
        open={contributeDialogOpen}
        onOpenChange={setContributeDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Money</DialogTitle>
            <DialogDescription>
              Contribute towards your savings goal.
            </DialogDescription>
          </DialogHeader>
          <Form {...contributeForm}>
            <form
              onSubmit={contributeForm.handleSubmit(onContribute)}
              className="space-y-4"
            >
              <FormField
                control={contributeForm.control}
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
                  onClick={() => setContributeDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Set your first savings goal!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const percent =
              goal.targetAmount > 0
                ? (goal.savedAmount / goal.targetAmount) * 100
                : 0
            const isComplete = percent >= 100
            const daysRemaining = getDaysRemaining(goal.deadline)

            return (
              <Card
                key={goal.id}
                className={
                  isComplete
                    ? "border-2 border-yellow-500 dark:border-yellow-400"
                    : ""
                }
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: goal.color + "20" }}
                      >
                        <CategoryIcon
                          name={goal.icon}
                          className="h-5 w-5"
                        />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {goal.name}
                          {isComplete && (
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          )}
                        </CardTitle>
                        {daysRemaining !== null && (
                          <p className="text-xs text-muted-foreground">
                            {daysRemaining > 0
                              ? `${daysRemaining} days remaining`
                              : daysRemaining === 0
                                ? "Due today"
                                : "Past deadline"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isComplete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openContributeDialog(goal.id)}
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(goal)}
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
                            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{goal.name}
                              &quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteGoal(goal.id)}
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
                    <span className="text-muted-foreground">
                      {formatCurrency(goal.savedAmount, settings.currency)} /{" "}
                      {formatCurrency(goal.targetAmount, settings.currency)}
                    </span>
                    <span
                      className={`font-medium ${
                        isComplete ? "text-yellow-500" : "text-foreground"
                      }`}
                    >
                      {Math.round(percent)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(percent, 100)}
                    className={`h-2 ${
                      isComplete
                        ? "[&>div]:bg-yellow-500"
                        : "[&>div]:bg-primary"
                    }`}
                    style={
                      !isComplete
                        ? {
                            ["--progress-color" as string]: goal.color,
                          }
                        : undefined
                    }
                  />
                  {isComplete && (
                    <div className="flex items-center gap-2 rounded-md bg-yellow-500/10 p-2 text-sm text-yellow-600 dark:text-yellow-400">
                      <Trophy className="h-4 w-4" />
                      <span>Goal reached! Congratulations!</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
