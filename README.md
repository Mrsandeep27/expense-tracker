# Expense Tracker

A full-featured personal finance tracker built with Next.js 15, React 19, and TypeScript. All data stays in your browser — no backend, no sign-up, completely private.

## Live Demo

[daily--expense-tracker.vercel.app](https://daily--expense-tracker.vercel.app)

## Features

### Core
- **Income & Expense Tracking** — Log transactions with categories, accounts, tags, and attachments
- **Multiple Accounts** — Manage cash, bank, credit card, digital wallet, and investment accounts with balance tracking and transfers
- **Budget Management** — Set monthly/weekly/yearly spending limits per category with color-coded progress alerts
- **Savings Goals** — Create goals with target amounts, deadlines, and contribution tracking
- **Recurring Transactions** — Automate regular income and expenses (daily/weekly/monthly/yearly)
- **Split Expenses** — Split costs with others, track who owes what, and mark as settled

### Analytics & Reports
- **Dashboard** — Balance overview, quick stats, budget alerts, recent transactions, spending breakdown, goal progress
- **Charts** — Income vs expenses bar chart, category donut chart, daily spending line chart, cumulative area chart
- **Monthly Report** — Detailed breakdown with category progress bars, budget compliance, month-over-month trends
- **Year-in-Review** — Annual summary, monthly comparison table, biggest transactions, category analysis

### Customization
- **Custom Categories** — Add your own categories with 30+ icon choices for both income and expenses
- **8 Currencies** — INR (with lakhs/crores formatting), USD, EUR, GBP, JPY, AUD, CAD, SGD
- **Dark Mode** — Full light/dark/system theme support
- **Onboarding Flow** — 5-step guided setup for new users

### Data & Security
- **PIN Lock** — 4-digit PIN protection with attempt limiting
- **Export/Import** — Full JSON backup and restore, CSV import with flexible headers
- **PWA Support** — Install as a standalone app, works offline
- **Data Validation** — All data validated with Zod schemas on read/write
- **Legacy Migration** — Automatically migrates data from v1 format

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/) |
| Components | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://radix-ui.com/) |
| Charts | [Recharts](https://recharts.org/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Forms | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Toasts | [Sonner](https://sonner.emilkowal.dev/) |
| Theme | [next-themes](https://github.com/pacocoursey/next-themes) |
| Language | TypeScript |
| Deployment | [Vercel](https://vercel.com/) |

## Try It

Check out the [Live Demo](https://daily--expense-tracker.vercel.app) — no installation needed.

## Project Structure

```
app/
  page.tsx              # Entry point
  layout.tsx            # Root layout with ThemeProvider + Toaster
  globals.css           # CSS variables and Tailwind config

components/
  app-provider.tsx      # Central state management (React Context)
  main-app.tsx          # App shell with sidebar navigation
  dashboard.tsx         # Home dashboard with widgets
  transaction-form.tsx  # Add/edit income or expense
  transaction-list.tsx  # Filterable, searchable transaction list
  budget-manager.tsx    # Category budget limits
  account-manager.tsx   # Multi-account management
  goal-tracker.tsx      # Savings goals with progress
  recurring-manager.tsx # Recurring transaction rules
  analytics-charts.tsx  # 4 chart types (bar, pie, line, area)
  monthly-report.tsx    # Detailed monthly breakdown
  year-review.tsx       # Annual summary and analysis
  category-manager.tsx  # Custom categories with icons
  settings-panel.tsx    # App settings and preferences
  pin-lock.tsx          # PIN authentication screen
  onboarding.tsx        # 5-step new user setup
  data-manager.tsx      # Import/export functionality
  split-expense.tsx     # Split costs with others
  ui/                   # shadcn/ui component library

lib/
  types.ts              # All Zod schemas and TypeScript types
  constants.ts          # Categories, accounts, currencies, colors
  store.ts              # localStorage operations with validation

utils/
  currency.ts           # Currency formatting (INR lakhs/crores support)

public/
  manifest.json         # PWA manifest
  sw.js                 # Service worker for offline support
```

## Architecture

```
ErrorBoundary
  └── AppProvider (React Context - all state management)
        └── PinLock (authentication gate)
              └── Onboarding (first-run setup)
                    └── MainApp (sidebar nav + view router)
                          ├── Dashboard
                          ├── Transactions
                          ├── Budgets
                          ├── Accounts
                          ├── Goals
                          ├── Recurring
                          ├── Analytics
                          ├── Monthly Report
                          ├── Year Review
                          ├── Categories
                          └── Settings
```

All state is managed through `AppProvider` using React Context. Components access data and CRUD operations via the `useApp()` hook. Data persists in localStorage with Zod validation on every read/write.

## License

MIT
