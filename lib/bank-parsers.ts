// ─── Bank Statement CSV/Text Parsers ─────────────────────────────────────────
// Parses CSV exports from major banks into normalized transaction records.

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RawBankTransaction {
  date: string // YYYY-MM-DD normalized
  description: string
  amount: number
  type: "debit" | "credit"
  balance?: number
  reference?: string
}

export interface ParseResult {
  success: boolean
  transactions: RawBankTransaction[]
  detectedFormat: string
  error?: string
  summary?: {
    totalDebit: number
    totalCredit: number
    dateRange: { from: string; to: string }
    transactionCount: number
  }
}

export const SUPPORTED_BANKS: { id: string; name: string; country: string }[] = [
  { id: "hdfc", name: "HDFC Bank", country: "India" },
  { id: "sbi", name: "State Bank of India", country: "India" },
  { id: "icici", name: "ICICI Bank", country: "India" },
  { id: "axis", name: "Axis Bank", country: "India" },
  { id: "kotak", name: "Kotak Mahindra Bank", country: "India" },
  { id: "chase", name: "Chase", country: "United States" },
  { id: "bofa", name: "Bank of America", country: "United States" },
  { id: "generic", name: "Generic CSV", country: "Any" },
]

// ─── CSV Parsing Utilities ───────────────────────────────────────────────────

/** Strip BOM and normalize line endings */
function sanitizeContent(content: string): string {
  return content
    .replace(/^\uFEFF/, "") // Remove BOM
    .replace(/\r\n/g, "\n") // Normalize CRLF
    .replace(/\r/g, "\n") // Normalize CR
}

/** Parse a single CSV line, respecting quoted fields with commas inside */
function parseCSVLine(line: string, separator: string = ","): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === separator) {
        fields.push(current)
        current = ""
      } else {
        current += ch
      }
    }
  }
  fields.push(current)

  return fields.map((f) => f.trim())
}

/** Detect whether the file uses tabs or commas as separator */
function detectSeparator(lines: string[]): string {
  const sampleLines = lines.slice(0, 5)
  let tabCount = 0
  let commaCount = 0
  for (const line of sampleLines) {
    tabCount += (line.match(/\t/g) || []).length
    commaCount += (line.match(/,/g) || []).length
  }
  return tabCount > commaCount ? "\t" : ","
}

/** Parse full CSV content into header + rows */
function parseCSV(content: string): { header: string[]; rows: string[][] } {
  const sanitized = sanitizeContent(content)
  const allLines = sanitized.split("\n").filter((line) => line.trim().length > 0)

  if (allLines.length < 2) {
    return { header: [], rows: [] }
  }

  const separator = detectSeparator(allLines)

  // Find the header line — skip leading non-data lines
  let headerIndex = 0
  for (let i = 0; i < Math.min(allLines.length, 10); i++) {
    const fields = parseCSVLine(allLines[i], separator)
    // A header typically has multiple fields and at least some text fields
    if (fields.length >= 3) {
      headerIndex = i
      break
    }
  }

  const header = parseCSVLine(allLines[headerIndex], separator)
  const rows: string[][] = []

  for (let i = headerIndex + 1; i < allLines.length; i++) {
    const row = parseCSVLine(allLines[i], separator)
    if (row.length >= 3) {
      rows.push(row)
    }
  }

  return { header, rows }
}

// ─── Description / Amount Helpers ────────────────────────────────────────────

/** Clean up description text */
function cleanDescription(raw: string): string {
  return raw
    .replace(/[\x00-\x1F\x7F]/g, " ") // Remove control chars
    .replace(/\s{2,}/g, " ") // Collapse multiple spaces
    .trim()
}

/** Parse a number from a potentially messy string (handles Indian lakhs commas, etc.) */
function parseAmount(raw: string | undefined): number {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return 0
  // Remove currency symbols, commas, spaces
  const cleaned = raw.replace(/[₹$€£,\s]/g, "").trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/** Check if a row looks like a summary/total row */
function isSummaryRow(fields: string[]): boolean {
  const joined = fields.join(" ").toLowerCase()
  return (
    /\b(total|opening balance|closing balance|statement summary|grand total)\b/.test(joined) &&
    !/\b(transfer|payment|purchase)\b/.test(joined)
  )
}

// ─── Date Parsing ────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04",
  may: "05", jun: "06", jul: "07", aug: "08",
  sep: "09", oct: "10", nov: "11", dec: "12",
}

/** Parse DD/MM/YY date */
function parseDateDDMMYY(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/)
  if (!m) return null
  const day = m[1].padStart(2, "0")
  const month = m[2].padStart(2, "0")
  let year = parseInt(m[3], 10)
  year = year >= 50 ? 1900 + year : 2000 + year
  return `${year}-${month}-${day}`
}

/** Parse DD/MM/YYYY date */
function parseDateDDMMYYYY(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (!m) return null
  const day = m[1].padStart(2, "0")
  const month = m[2].padStart(2, "0")
  const year = m[3]
  return `${year}-${month}-${day}`
}

/** Parse MM/DD/YYYY date (US format) */
function parseDateMMDDYYYY(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (!m) return null
  const month = m[1].padStart(2, "0")
  const day = m[2].padStart(2, "0")
  const year = m[3]
  return `${year}-${month}-${day}`
}

/** Parse DD MMM YYYY date (e.g. "15 Jan 2024") */
function parseDateDDMMMYYYY(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/)
  if (!m) return null
  const day = m[1].padStart(2, "0")
  const month = MONTH_MAP[m[2].toLowerCase()]
  if (!month) return null
  const year = m[3]
  return `${year}-${month}-${day}`
}

/** Parse DD-MM-YYYY date (with dashes) */
function parseDateDDDashMMDashYYYY(raw: string): string | null {
  return parseDateDDMMYYYY(raw) // Same logic, the regex already accepts dashes
}

// ─── Format Detection ────────────────────────────────────────────────────────

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim()
}

export function detectBankFormat(content: string): string {
  const sanitized = sanitizeContent(content)
  const lines = sanitized.split("\n").filter((l) => l.trim().length > 0)

  // Check first 3 lines for header patterns
  const headerCandidate = lines.slice(0, 3).join(" ")
  const h = normalizeHeader(headerCandidate)

  // HDFC: "Narration" and "Closing Balance"
  if (h.includes("narration") && h.includes("closing balance")) return "hdfc"

  // SBI: "Txn Date" and "Value Date"
  if (h.includes("txn date") && h.includes("value date")) return "sbi"

  // ICICI: "Transaction Remarks"
  if (h.includes("transaction remarks")) return "icici"

  // Axis: "PARTICULARS" and "CHQNO"
  if (h.includes("particulars") && h.includes("chqno")) return "axis"

  // Kotak: "Chq / Ref No"
  if (h.includes("chq") && h.includes("ref no")) return "kotak"

  // Chase: "Post Date" and "Category"
  if (h.includes("post date") && h.includes("category")) return "chase"

  // Bank of America: "Running Bal"
  if (h.includes("running bal")) return "bofa"

  return "generic"
}

// ─── Individual Bank Parsers ─────────────────────────────────────────────────

function findColumnIndex(header: string[], ...patterns: string[]): number {
  for (const pattern of patterns) {
    const idx = header.findIndex(
      (h) => normalizeHeader(h).includes(pattern.toLowerCase())
    )
    if (idx !== -1) return idx
  }
  return -1
}

function parseHDFC(header: string[], rows: string[][]): RawBankTransaction[] {
  // Columns: Date, Narration, Chq./Ref.No., Value Dt, Withdrawal Amt., Deposit Amt., Closing Balance
  const iDate = findColumnIndex(header, "date")
  const iNarration = findColumnIndex(header, "narration")
  const iRef = findColumnIndex(header, "chq", "ref")
  const iWithdrawal = findColumnIndex(header, "withdrawal")
  const iDeposit = findColumnIndex(header, "deposit")
  const iBalance = findColumnIndex(header, "closing balance")

  const txns: RawBankTransaction[] = []
  for (const row of rows) {
    if (isSummaryRow(row)) continue
    const dateStr = row[iDate] || ""
    const date = parseDateDDMMYY(dateStr) || parseDateDDMMYYYY(dateStr)
    if (!date) continue

    const withdrawal = parseAmount(row[iWithdrawal])
    const deposit = parseAmount(row[iDeposit])
    if (withdrawal === 0 && deposit === 0) continue

    txns.push({
      date,
      description: cleanDescription(row[iNarration] || ""),
      amount: withdrawal > 0 ? withdrawal : deposit,
      type: withdrawal > 0 ? "debit" : "credit",
      balance: iBalance >= 0 ? parseAmount(row[iBalance]) || undefined : undefined,
      reference: iRef >= 0 ? (row[iRef] || "").trim() || undefined : undefined,
    })
  }
  return txns
}

function parseSBI(header: string[], rows: string[][]): RawBankTransaction[] {
  // Columns: Txn Date, Value Date, Description, Ref No./Cheque No., Debit, Credit, Balance
  const iDate = findColumnIndex(header, "txn date")
  const iDesc = findColumnIndex(header, "description")
  const iRef = findColumnIndex(header, "ref no", "cheque")
  const iDebit = findColumnIndex(header, "debit")
  const iCredit = findColumnIndex(header, "credit")
  const iBalance = findColumnIndex(header, "balance")

  const txns: RawBankTransaction[] = []
  for (const row of rows) {
    if (isSummaryRow(row)) continue
    const dateStr = row[iDate] || ""
    const date = parseDateDDMMMYYYY(dateStr)
    if (!date) continue

    const debit = parseAmount(row[iDebit])
    const credit = parseAmount(row[iCredit])
    if (debit === 0 && credit === 0) continue

    txns.push({
      date,
      description: cleanDescription(row[iDesc] || ""),
      amount: debit > 0 ? debit : credit,
      type: debit > 0 ? "debit" : "credit",
      balance: iBalance >= 0 ? parseAmount(row[iBalance]) || undefined : undefined,
      reference: iRef >= 0 ? (row[iRef] || "").trim() || undefined : undefined,
    })
  }
  return txns
}

function parseICICI(header: string[], rows: string[][]): RawBankTransaction[] {
  // Columns: S No., Value Date, Transaction Date, Cheque Number, Transaction Remarks,
  //          Withdrawal Amount (INR), Deposit Amount (INR), Balance (INR)
  const iDate = findColumnIndex(header, "transaction date")
  const iRemarks = findColumnIndex(header, "transaction remarks")
  const iCheque = findColumnIndex(header, "cheque number")
  const iWithdrawal = findColumnIndex(header, "withdrawal")
  const iDeposit = findColumnIndex(header, "deposit")
  const iBalance = findColumnIndex(header, "balance")

  const txns: RawBankTransaction[] = []
  for (const row of rows) {
    if (isSummaryRow(row)) continue
    const dateStr = row[iDate] || ""
    const date = parseDateDDMMYYYY(dateStr)
    if (!date) continue

    const withdrawal = parseAmount(row[iWithdrawal])
    const deposit = parseAmount(row[iDeposit])
    if (withdrawal === 0 && deposit === 0) continue

    txns.push({
      date,
      description: cleanDescription(row[iRemarks] || ""),
      amount: withdrawal > 0 ? withdrawal : deposit,
      type: withdrawal > 0 ? "debit" : "credit",
      balance: iBalance >= 0 ? parseAmount(row[iBalance]) || undefined : undefined,
      reference: iCheque >= 0 ? (row[iCheque] || "").trim() || undefined : undefined,
    })
  }
  return txns
}

function parseAxis(header: string[], rows: string[][]): RawBankTransaction[] {
  // Columns: Tran Date, CHQNO, PARTICULARS, DR, CR, BAL, SOL
  const iDate = findColumnIndex(header, "tran date")
  const iParticulars = findColumnIndex(header, "particulars")
  const iChqNo = findColumnIndex(header, "chqno")
  const iDR = findColumnIndex(header, "dr")
  const iCR = findColumnIndex(header, "cr")
  const iBalance = findColumnIndex(header, "bal")

  const txns: RawBankTransaction[] = []
  for (const row of rows) {
    if (isSummaryRow(row)) continue
    const dateStr = row[iDate] || ""
    const date = parseDateDDDashMMDashYYYY(dateStr)
    if (!date) continue

    const dr = parseAmount(row[iDR])
    const cr = parseAmount(row[iCR])
    if (dr === 0 && cr === 0) continue

    txns.push({
      date,
      description: cleanDescription(row[iParticulars] || ""),
      amount: dr > 0 ? dr : cr,
      type: dr > 0 ? "debit" : "credit",
      balance: iBalance >= 0 ? parseAmount(row[iBalance]) || undefined : undefined,
      reference: iChqNo >= 0 ? (row[iChqNo] || "").trim() || undefined : undefined,
    })
  }
  return txns
}

function parseKotak(header: string[], rows: string[][]): RawBankTransaction[] {
  // Columns: Sr No, Transaction Date, Value Date, Description, Chq / Ref No, Debit, Credit, Balance
  const iDate = findColumnIndex(header, "transaction date")
  const iDesc = findColumnIndex(header, "description")
  const iRef = findColumnIndex(header, "chq", "ref no")
  const iDebit = findColumnIndex(header, "debit")
  const iCredit = findColumnIndex(header, "credit")
  const iBalance = findColumnIndex(header, "balance")

  const txns: RawBankTransaction[] = []
  for (const row of rows) {
    if (isSummaryRow(row)) continue
    const dateStr = row[iDate] || ""
    const date = parseDateDDMMYYYY(dateStr)
    if (!date) continue

    const debit = parseAmount(row[iDebit])
    const credit = parseAmount(row[iCredit])
    if (debit === 0 && credit === 0) continue

    txns.push({
      date,
      description: cleanDescription(row[iDesc] || ""),
      amount: debit > 0 ? debit : credit,
      type: debit > 0 ? "debit" : "credit",
      balance: iBalance >= 0 ? parseAmount(row[iBalance]) || undefined : undefined,
      reference: iRef >= 0 ? (row[iRef] || "").trim() || undefined : undefined,
    })
  }
  return txns
}

function parseChase(header: string[], rows: string[][]): RawBankTransaction[] {
  // Columns: Transaction Date, Post Date, Description, Category, Type, Amount
  const iDate = findColumnIndex(header, "transaction date")
  const iDesc = findColumnIndex(header, "description")
  const iAmount = findColumnIndex(header, "amount")

  const txns: RawBankTransaction[] = []
  for (const row of rows) {
    if (isSummaryRow(row)) continue
    const dateStr = row[iDate] || ""
    const date = parseDateMMDDYYYY(dateStr)
    if (!date) continue

    const amount = parseAmount(row[iAmount])
    if (amount === 0) continue

    // Chase: negative = debit, positive = credit
    txns.push({
      date,
      description: cleanDescription(row[iDesc] || ""),
      amount: Math.abs(amount),
      type: amount < 0 ? "debit" : "credit",
    })
  }
  return txns
}

function parseBofA(header: string[], rows: string[][]): RawBankTransaction[] {
  // Columns: Date, Description, Amount, Running Bal.
  const iDate = findColumnIndex(header, "date")
  const iDesc = findColumnIndex(header, "description")
  const iAmount = findColumnIndex(header, "amount")
  const iBalance = findColumnIndex(header, "running bal")

  const txns: RawBankTransaction[] = []
  for (const row of rows) {
    if (isSummaryRow(row)) continue
    const dateStr = row[iDate] || ""
    const date = parseDateMMDDYYYY(dateStr)
    if (!date) continue

    const amount = parseAmount(row[iAmount])
    if (amount === 0) continue

    // Negative = debit
    txns.push({
      date,
      description: cleanDescription(row[iDesc] || ""),
      amount: Math.abs(amount),
      type: amount < 0 ? "debit" : "credit",
      balance: iBalance >= 0 ? parseAmount(row[iBalance]) || undefined : undefined,
    })
  }
  return txns
}

// ─── Generic CSV Parser ─────────────────────────────────────────────────────

function parseGeneric(header: string[], rows: string[][]): RawBankTransaction[] {
  const norm = header.map(normalizeHeader)

  // Find date column
  const datePatterns = ["date", "transaction date", "txn date", "posting date", "value date"]
  let iDate = -1
  for (const p of datePatterns) {
    iDate = norm.findIndex((h) => h.includes(p))
    if (iDate !== -1) break
  }
  if (iDate === -1) return []

  // Find description column
  const descPatterns = ["description", "narration", "particulars", "remarks", "memo", "details"]
  let iDesc = -1
  for (const p of descPatterns) {
    iDesc = norm.findIndex((h) => h.includes(p))
    if (iDesc !== -1) break
  }
  if (iDesc === -1) return []

  // Find amount columns — either single amount or separate debit/credit
  const amountPatterns = ["amount"]
  const debitPatterns = ["debit", "withdrawal", "dr"]
  const creditPatterns = ["credit", "deposit", "cr"]

  let iAmount = -1
  for (const p of amountPatterns) {
    iAmount = norm.findIndex((h) => h === p || h === `${p} inr`)
    if (iAmount !== -1) break
  }

  let iDebit = -1
  for (const p of debitPatterns) {
    iDebit = norm.findIndex((h) => h.includes(p))
    if (iDebit !== -1) break
  }

  let iCredit = -1
  for (const p of creditPatterns) {
    iCredit = norm.findIndex((h) => h.includes(p) && h !== norm[iDebit])
    if (iCredit !== -1) break
  }

  const hasSeparateColumns = iDebit !== -1 && iCredit !== -1
  if (iAmount === -1 && !hasSeparateColumns) return []

  // Find balance column (optional)
  const balPatterns = ["balance", "closing balance", "running balance", "bal"]
  let iBalance = -1
  for (const p of balPatterns) {
    iBalance = norm.findIndex((h) => h.includes(p))
    if (iBalance !== -1) break
  }

  // Try to guess date format from first data row
  const sampleDate = (rows[0]?.[iDate] || "").trim()
  type DateParser = (raw: string) => string | null
  let dateParsers: DateParser[] = [
    parseDateDDMMYYYY,
    parseDateMMDDYYYY,
    parseDateDDMMMYYYY,
    parseDateDDMMYY,
  ]
  // If the sample matches DD MMM YYYY, prefer that
  if (/^\d{1,2}\s+\w{3}\s+\d{4}$/.test(sampleDate)) {
    dateParsers = [parseDateDDMMMYYYY, ...dateParsers.filter((p) => p !== parseDateDDMMMYYYY)]
  }

  function tryParseDate(raw: string): string | null {
    for (const parser of dateParsers) {
      const result = parser(raw)
      if (result) return result
    }
    return null
  }

  const txns: RawBankTransaction[] = []
  for (const row of rows) {
    if (isSummaryRow(row)) continue
    const dateStr = row[iDate] || ""
    const date = tryParseDate(dateStr)
    if (!date) continue

    let amount: number
    let type: "debit" | "credit"

    if (hasSeparateColumns) {
      const debit = parseAmount(row[iDebit])
      const credit = parseAmount(row[iCredit])
      if (debit === 0 && credit === 0) continue
      amount = debit > 0 ? debit : credit
      type = debit > 0 ? "debit" : "credit"
    } else {
      const rawAmount = parseAmount(row[iAmount])
      if (rawAmount === 0) continue
      amount = Math.abs(rawAmount)
      type = rawAmount < 0 ? "debit" : "credit"
    }

    txns.push({
      date,
      description: cleanDescription(row[iDesc] || ""),
      amount,
      type,
      balance: iBalance >= 0 ? parseAmount(row[iBalance]) || undefined : undefined,
    })
  }
  return txns
}

// ─── Summary Builder ─────────────────────────────────────────────────────────

function buildSummary(txns: RawBankTransaction[]): ParseResult["summary"] {
  if (txns.length === 0) return undefined

  let totalDebit = 0
  let totalCredit = 0
  const dates = txns.map((t) => t.date).sort()

  for (const t of txns) {
    if (t.type === "debit") totalDebit += t.amount
    else totalCredit += t.amount
  }

  return {
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    dateRange: { from: dates[0], to: dates[dates.length - 1] },
    transactionCount: txns.length,
  }
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

const PARSER_MAP: Record<
  string,
  (header: string[], rows: string[][]) => RawBankTransaction[]
> = {
  hdfc: parseHDFC,
  sbi: parseSBI,
  icici: parseICICI,
  axis: parseAxis,
  kotak: parseKotak,
  chase: parseChase,
  bofa: parseBofA,
  generic: parseGeneric,
}

export function parseBankStatement(content: string, format?: string): ParseResult {
  try {
    if (!content || content.trim().length === 0) {
      return { success: false, transactions: [], detectedFormat: "unknown", error: "Empty file content" }
    }

    const detectedFormat = format || detectBankFormat(content)
    const { header, rows } = parseCSV(content)

    if (header.length === 0) {
      return { success: false, transactions: [], detectedFormat, error: "Could not parse CSV headers" }
    }

    if (rows.length === 0) {
      return { success: false, transactions: [], detectedFormat, error: "No data rows found in file" }
    }

    const parser = PARSER_MAP[detectedFormat] || parseGeneric
    const transactions = parser(header, rows)

    if (transactions.length === 0) {
      return {
        success: false,
        transactions: [],
        detectedFormat,
        error: "No valid transactions found. The file format may not match the expected structure.",
      }
    }

    return {
      success: true,
      transactions,
      detectedFormat,
      summary: buildSummary(transactions),
    }
  } catch (err) {
    return {
      success: false,
      transactions: [],
      detectedFormat: format || "unknown",
      error: `Failed to parse statement: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
}
