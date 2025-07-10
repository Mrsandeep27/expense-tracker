import type { Currency } from "@/components/currency-setup"

export function formatCurrency(amount: number, currency?: Currency): string {
  // Provide default currency if none provided
  const defaultCurrency = currency || { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" }

  // Special formatting for Indian Rupee
  if (defaultCurrency.code === "INR") {
    return formatIndianCurrency(amount, defaultCurrency.symbol)
  }

  // Standard formatting for other currencies
  return new Intl.NumberFormat(defaultCurrency.locale, {
    style: "currency",
    currency: defaultCurrency.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatIndianCurrency(amount: number, symbol: string): string {
  const isNegative = amount < 0
  const absAmount = Math.abs(amount)

  // Convert to string and split into integer and decimal parts
  const [integerPart, decimalPart = "00"] = absAmount.toFixed(2).split(".")

  // Apply Indian number formatting (lakhs and crores)
  let formattedInteger = ""
  const integerStr = integerPart

  if (integerStr.length <= 3) {
    formattedInteger = integerStr
  } else if (integerStr.length <= 5) {
    // Thousands
    formattedInteger = integerStr.slice(0, -3) + "," + integerStr.slice(-3)
  } else if (integerStr.length <= 7) {
    // Lakhs
    formattedInteger = integerStr.slice(0, -5) + "," + integerStr.slice(-5, -3) + "," + integerStr.slice(-3)
  } else {
    // Crores and above
    const crores = integerStr.slice(0, -7)
    const lakhs = integerStr.slice(-7, -5)
    const thousands = integerStr.slice(-5, -3)
    const hundreds = integerStr.slice(-3)

    formattedInteger = crores + "," + lakhs + "," + thousands + "," + hundreds
  }

  const formatted = `${symbol}${formattedInteger}.${decimalPart}`
  return isNegative ? `-${formatted}` : formatted
}

export function parseCurrencyInput(input: string): number {
  // Remove currency symbols and commas, then parse
  const cleaned = input.replace(/[₹$€£¥,\s]/g, "")
  return Number.parseFloat(cleaned) || 0
}
