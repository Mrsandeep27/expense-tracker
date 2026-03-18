"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/components/app-provider"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lock, ShieldAlert } from "lucide-react"

interface PinLockProps {
  children: React.ReactNode
}

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 60000 // 1 minute

export function PinLock({ children }: PinLockProps) {
  const { settings, loaded } = useApp()
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = sessionStorage.getItem("et_unlocked")
    if (stored === "true") {
      setUnlocked(true)
    }
    // Restore lockout state
    const lockoutEnd = sessionStorage.getItem("et_lockout_until")
    if (lockoutEnd) {
      const endTime = parseInt(lockoutEnd, 10)
      if (Date.now() < endTime) {
        setLockedUntil(endTime)
        setAttempts(MAX_ATTEMPTS)
      } else {
        sessionStorage.removeItem("et_lockout_until")
      }
    }
  }, [])

  // Handle lockout timer
  useEffect(() => {
    if (!lockedUntil) return
    const remaining = lockedUntil - Date.now()
    if (remaining <= 0) {
      setLockedUntil(null)
      setAttempts(0)
      sessionStorage.removeItem("et_lockout_until")
      return
    }
    const timer = setTimeout(() => {
      setLockedUntil(null)
      setAttempts(0)
      sessionStorage.removeItem("et_lockout_until")
    }, remaining)
    return () => clearTimeout(timer)
  }, [lockedUntil])

  // If no PIN is set or already unlocked, render children
  if (!mounted || !loaded) return null
  if (!settings.pin || unlocked) return <>{children}</>

  const isLockedOut = lockedUntil !== null && Date.now() < lockedUntil

  const handlePinComplete = (value: string) => {
    setPin(value)
    if (value.length === 4) {
      const storedPin = atob(settings.pin!)
      if (value === storedPin) {
        setUnlocked(true)
        sessionStorage.setItem("et_unlocked", "true")
        setError("")
      } else {
        const newAttempts = attempts + 1
        setAttempts(newAttempts)
        setPin("")
        if (newAttempts >= MAX_ATTEMPTS) {
          const lockEnd = Date.now() + LOCKOUT_DURATION
          setLockedUntil(lockEnd)
          sessionStorage.setItem("et_lockout_until", lockEnd.toString())
          setError("")
        } else {
          setError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`)
        }
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-4">
              {isLockedOut ? (
                <ShieldAlert className="h-8 w-8 text-destructive" />
              ) : (
                <Lock className="h-8 w-8 text-primary" />
              )}
            </div>
          </div>
          <CardTitle className="text-xl">
            {isLockedOut ? "Too Many Attempts" : "Enter PIN"}
          </CardTitle>
          <CardDescription>
            {isLockedOut
              ? "Please try again later"
              : "Enter your 4-digit PIN to unlock the app"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {isLockedOut ? (
            <p className="text-sm text-muted-foreground text-center">
              You have exceeded the maximum number of attempts. Please wait a moment before trying again.
            </p>
          ) : (
            <>
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={handlePinComplete}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                </InputOTPGroup>
              </InputOTP>
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setPin("")}
              >
                Clear
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
