"use client"

import { icons, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CategoryIconProps {
  name: string
  className?: string
  fallback?: string
}

export function CategoryIcon({ name, className, fallback = "Circle" }: CategoryIconProps) {
  const Icon = (icons as Record<string, LucideIcon>)[name] || (icons as Record<string, LucideIcon>)[fallback]
  if (!Icon) return null
  return <Icon className={cn("h-4 w-4", className)} />
}
