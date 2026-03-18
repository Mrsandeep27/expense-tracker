"use client"

import { useState } from "react"
import { useApp } from "@/components/app-provider"
import { CategoryIcon } from "@/components/category-icon"
import type { Category, CategoryFormData } from "@/lib/types"
import { CategoryFormSchema } from "@/lib/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

const ICON_OPTIONS = [
  "Utensils", "Car", "ShoppingBag", "Gamepad2", "Receipt", "HeartPulse",
  "Plane", "GraduationCap", "Home", "Wifi", "ShoppingCart", "Sparkles",
  "Briefcase", "Laptop", "TrendingUp", "Building2", "Gift", "RotateCcw",
  "Coins", "Coffee", "Shirt", "Dumbbell", "Music", "BookOpen",
  "Camera", "Smartphone", "Palette", "Wrench", "Dog", "Baby", "Plus",
]

export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory } = useApp()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const expenseCategories = categories.filter((c) => c.type === "expense" || c.type === "both")
  const incomeCategories = categories.filter((c) => c.type === "income" || c.type === "both")

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: {
      name: "",
      icon: "Plus",
      type: "expense",
    },
  })

  const openAddDialog = () => {
    setEditingCategory(null)
    form.reset({ name: "", icon: "Plus", type: "expense" })
    setDialogOpen(true)
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    form.reset({ name: category.name, icon: category.icon, type: category.type })
    setDialogOpen(true)
  }

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategory(editingCategory.id, data)
      toast.success("Category updated")
    } else {
      addCategory(data)
      toast.success("Category added")
    }
    setDialogOpen(false)
    form.reset()
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteCategory(deleteTarget.id)
    toast.success("Category deleted")
    setDeleteTarget(null)
  }

  const renderCategoryRow = (category: Category) => (
    <div
      key={category.id}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <CategoryIcon name={category.icon} className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{category.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {category.type}
            </Badge>
            {category.isDefault && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Default
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {!category.isDefault ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEditDialog(category)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(category)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Default categories cannot be deleted</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Categories</h3>
          <p className="text-sm text-muted-foreground">Manage your expense and income categories</p>
        </div>
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense Categories</CardTitle>
          <CardDescription>{expenseCategories.length} categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {expenseCategories.map(renderCategoryRow)}
        </CardContent>
      </Card>

      {/* Income Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income Categories</CardTitle>
          <CardDescription>{incomeCategories.length} categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {incomeCategories.map(renderCategoryRow)}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the category details"
                : "Create a new category for your transactions"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Category name" {...field} />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <FormControl>
                      <ScrollArea className="h-48 rounded-lg border border-border p-2">
                        <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
                          {ICON_OPTIONS.map((iconName) => (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => field.onChange(iconName)}
                              className={cn(
                                "flex flex-col items-center gap-1 rounded-lg p-2 transition-colors text-center",
                                field.value === iconName
                                  ? "bg-primary text-primary-foreground"
                                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <CategoryIcon
                                name={iconName}
                                className={cn(
                                  "h-5 w-5",
                                  field.value === iconName
                                    ? "text-primary-foreground"
                                    : ""
                                )}
                              />
                              <span className="text-[9px] leading-tight truncate w-full">
                                {iconName}
                              </span>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCategory ? "Save Changes" : "Add Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
              Existing transactions with this category will keep their category label.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
