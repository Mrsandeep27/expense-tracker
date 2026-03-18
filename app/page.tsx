"use client"

import { AppProvider } from "@/components/app-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { PinLock } from "@/components/pin-lock"
import { Onboarding } from "@/components/onboarding"
import { MainApp } from "@/components/main-app"

export default function Home() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <PinLock>
          <Onboarding>
            <MainApp />
          </Onboarding>
        </PinLock>
      </AppProvider>
    </ErrorBoundary>
  )
}
