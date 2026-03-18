// ─── Auto-Categorization Engine ─────────────────────────────
// Maps transaction descriptions/merchant names to categories
// using keyword matching with priority scoring.

// ─── Types ──────────────────────────────────────────────────

interface CategorizationResult {
  category: string
  confidence: number
}

type TransactionType = "expense" | "income"

interface KeywordRule {
  pattern: RegExp
  category: string
  type: TransactionType
  confidence: number
}

// ─── Keyword Definitions ────────────────────────────────────
// Organized by category. Each entry has:
//   - merchants: exact brand/merchant names (confidence 1.0)
//   - strong: strong keyword matches (confidence 0.8)
//   - partial: weaker/ambiguous keywords (confidence 0.6)

interface CategoryKeywords {
  category: string
  type: TransactionType
  merchants: string[]
  strong: string[]
  partial: string[]
}

const CATEGORY_KEYWORDS: CategoryKeywords[] = [
  // ── Expense Categories ──────────────────────────────────

  {
    category: "Food & Dining",
    type: "expense",
    merchants: [
      "swiggy", "zomato", "uber eats", "ubereats", "doordash", "grubhub",
      "dominos", "domino's", "mcdonalds", "mcdonald's", "burger king",
      "starbucks", "kfc", "subway", "pizza hut", "taco bell", "wendy's",
      "chipotle", "panda express", "chick-fil-a", "popeyes", "dunkin",
      "baskin robbins", "haldiram", "barbeque nation", "wow momo",
      "faasos", "behrouz", "box8", "eatfit", "licious", "freshmenu",
      "rebel foods", "chaayos", "chai point", "third wave coffee",
      "blue tokai", "mad over donuts", "krispy kreme", "cold stone",
      "naturals ice cream", "amul", "mother dairy",
    ],
    strong: [
      "restaurant", "cafe", "coffee", "bakery", "food", "dining",
      "lunch", "dinner", "breakfast", "biryani", "chai", "tea", "dosa",
      "dhaba", "mess", "canteen", "tiffin", "snack", "ice cream",
      "dessert", "juice", "bar", "pub", "brewery", "pizzeria",
      "bistro", "eatery", "diner", "grill", "buffet", "takeout",
      "takeaway", "delivery", "kitchen", "cook", "meal", "brunch",
      "noodle", "sushi", "ramen", "burger", "pizza", "wrap", "roll",
      "sandwich", "kebab", "tandoori", "thali", "paneer", "chicken",
      "mutton", "fish fry", "chaat", "pav bhaji", "vada pav",
      "idli", "samosa", "paratha", "kulcha", "naan", "momos",
      "pastry", "cake", "chocolate", "sweet shop", "mithai",
    ],
    partial: [
      "eat", "hotel", "drink", "beverage", "refreshment", "catering",
    ],
  },

  {
    category: "Transportation",
    type: "expense",
    merchants: [
      "uber", "ola", "lyft", "rapido", "metro", "irctc", "shell",
      "hp petrol", "indian oil", "bharat petroleum", "iocl", "bpcl", "hpcl",
      "grab", "bolt", "gojek", "blablacar", "bounce", "yulu", "vogo",
    ],
    strong: [
      "bus", "train", "railway", "petrol", "diesel", "fuel", "gas station",
      "parking", "toll", "fastag", "auto", "rickshaw", "cab", "taxi",
      "bike", "cycle", "e-rickshaw", "tram", "ferry", "commute",
      "car wash", "car service", "vehicle", "tyre", "tire", "mechanic",
      "garage", "servicing", "two wheeler", "scooter", "ev charging",
      "charging station",
    ],
    partial: [
      "ride", "trip", "transport", "transit", "pass", "fare",
    ],
  },

  {
    category: "Shopping",
    type: "expense",
    merchants: [
      "amazon", "flipkart", "myntra", "ajio", "meesho", "walmart",
      "target", "costco", "ikea", "d-mart", "dmart", "big bazaar",
      "reliance", "decathlon", "nykaa", "tata cliq", "snapdeal",
      "shopclues", "pepperfry", "urban ladder", "lenskart", "mamaearth",
      "boat", "noise", "croma", "vijay sales", "reliance digital",
      "chroma", "best buy", "h&m", "zara", "uniqlo", "westside",
      "pantaloons", "lifestyle", "central", "shoppers stop",
      "max fashion", "fbb", "v-mart", "vishal mega mart",
    ],
    strong: [
      "mall", "shop", "store", "retail", "purchase", "buy", "market",
      "bazaar", "online order", "order", "e-commerce", "ecommerce",
      "fashion", "clothing", "apparel", "shoes", "footwear",
      "electronics", "gadget", "appliance", "furniture", "home decor",
      "kitchenware", "accessory", "accessories", "jewellery", "jewelry",
      "watch", "bag", "handbag", "wallet", "sunglasses",
    ],
    partial: [
      "mart", "outlet", "boutique", "emporium",
    ],
  },

  {
    category: "Entertainment",
    type: "expense",
    merchants: [
      "netflix", "spotify", "hotstar", "prime video", "disney plus",
      "disney+", "youtube premium", "apple music", "apple tv",
      "pvr", "inox", "cinepolis", "steam", "playstation", "xbox",
      "nintendo", "epic games", "riot games", "ea sports",
      "book my show", "bookmyshow", "paytm insider", "townscript",
      "twitch", "crunchyroll", "hbo", "hulu", "jiocinema", "zee5",
      "sonyliv", "voot", "mubi", "aha", "alt balaji",
      "amazon prime", "audible", "kindle unlimited",
    ],
    strong: [
      "movie", "cinema", "game", "gaming", "concert", "event",
      "ticket", "show", "theatre", "theater", "play", "drama",
      "comedy", "standup", "stand-up", "amusement", "theme park",
      "water park", "arcade", "bowling", "pool", "karaoke",
      "museum", "gallery", "exhibition", "festival", "carnival",
      "club", "nightclub", "disco", "streaming",
    ],
    partial: [
      "fun", "recreation", "leisure", "hobby", "sport",
    ],
  },

  {
    category: "Bills & Utilities",
    type: "expense",
    merchants: [
      "jio", "airtel", "vi", "vodafone", "bsnl", "tata sky",
      "dish tv", "d2h", "sun direct", "hathway", "act fibernet",
      "excitel", "you broadband", "tikona", "mtnl", "idea",
      "reliance jio", "airtel xstream",
    ],
    strong: [
      "electricity", "water bill", "gas bill", "internet", "broadband",
      "wifi", "phone bill", "recharge", "dth", "mobile", "postpaid",
      "prepaid", "maintenance", "society", "municipality", "utility",
      "sewage", "garbage", "waste", "cable", "landline", "telephone",
      "piped gas", "png", "lpg", "cylinder", "electric", "power bill",
    ],
    partial: [
      "bill", "payment", "charge", "plan", "renewal",
    ],
  },

  {
    category: "Healthcare",
    type: "expense",
    merchants: [
      "apollo", "medplus", "1mg", "netmeds", "pharmeasy", "practo",
      "lybrate", "star health", "max hospital", "fortis", "manipal",
      "narayana", "aiims", "medanta", "columbia asia", "aster",
      "sahyadri", "kokilaben", "lilavati", "breach candy", "hinduja",
      "thyrocare", "dr lal path", "srl diagnostics", "metropolis",
    ],
    strong: [
      "hospital", "doctor", "clinic", "medical", "pharmacy", "medicine",
      "lab", "diagnostic", "health", "dental", "dentist", "eye",
      "optical", "optician", "insurance premium", "checkup", "check-up",
      "consultation", "prescription", "surgery", "treatment", "therapy",
      "physiotherapy", "ortho", "cardio", "derma", "skin", "ent",
      "gynec", "pediatr", "x-ray", "xray", "mri", "ct scan",
      "ultrasound", "blood test", "pathology", "vaccination", "vaccine",
      "covid test", "pcr", "ambulance", "nursing",
    ],
    partial: [
      "care", "wellness", "supplement", "vitamin", "ayurved", "homeopath",
    ],
  },

  {
    category: "Travel",
    type: "expense",
    merchants: [
      "indigo", "air india", "vistara", "spicejet", "goair", "go first",
      "akasa", "emirates", "qatar airways", "singapore airlines",
      "british airways", "lufthansa", "oyo", "makemytrip", "mmt",
      "goibibo", "cleartrip", "airbnb", "booking.com", "yatra",
      "trivago", "agoda", "hostelworld", "ixigo", "ease my trip",
      "easemytrip", "thomas cook", "cox and kings", "zostel",
      "fabhotels", "treebo", "lemon tree", "taj", "marriott",
      "hilton", "hyatt", "radisson", "itc hotels", "oberoi",
    ],
    strong: [
      "flight", "airline", "hotel booking", "travel", "trip", "visa",
      "passport", "luggage", "suitcase", "backpack", "airport",
      "boarding", "check-in", "resort", "vacation", "holiday",
      "tour", "cruise", "excursion", "sightseeing", "pilgrimage",
      "trek", "camping", "adventure", "safari",
    ],
    partial: [
      "stay", "accommodation", "lodge", "inn", "guest house", "guesthouse",
    ],
  },

  {
    category: "Education",
    type: "expense",
    merchants: [
      "udemy", "coursera", "skillshare", "linkedin learning",
      "pluralsight", "edx", "khan academy", "byju", "byjus",
      "unacademy", "vedantu", "toppr", "meritnation", "doubtnut",
      "whitehat jr", "coding ninjas", "scaler", "upgrad",
      "great learning", "simplilearn", "intellipaat", "edureka",
      "codecademy", "freecodecamp", "masterclass", "brilliant",
      "duolingo", "babbel", "chegg",
    ],
    strong: [
      "school", "college", "university", "tuition", "course", "book",
      "textbook", "exam", "fee", "coaching", "class", "tutorial",
      "library", "stationery", "notebook", "pen", "pencil",
      "education", "learning", "training", "workshop", "seminar",
      "webinar", "certificate", "degree", "diploma", "scholarship",
      "admission", "enrollment", "syllabus", "curriculum",
    ],
    partial: [
      "study", "lesson", "lecture", "academic", "institute",
    ],
  },

  {
    category: "Rent & Housing",
    type: "expense",
    merchants: [
      "nobroker", "magicbricks", "99acres", "housing.com", "nestaway",
      "colive", "zolo", "stanza living",
    ],
    strong: [
      "rent", "lease", "landlord", "housing", "apartment", "flat",
      "pg", "hostel", "mortgage", "emi", "home loan", "property tax",
      "broker", "brokerage", "security deposit", "caution deposit",
      "house tax", "stamp duty", "registration", "tenant",
      "maintenance charge", "repair", "plumber", "plumbing",
      "electrician", "carpenter", "painting", "renovation",
      "interior", "pest control", "shifting", "movers", "packers",
    ],
    partial: [
      "home", "house", "room", "residential",
    ],
  },

  {
    category: "Subscriptions",
    type: "expense",
    merchants: [
      "icloud", "google one", "dropbox", "notion", "figma", "canva",
      "github", "linkedin premium", "microsoft 365", "office 365",
      "adobe", "creative cloud", "chatgpt", "openai", "grammarly",
      "evernote", "todoist", "slack", "zoom", "medium",
      "the hindu", "times of india", "economic times", "wsj",
      "new york times", "washington post", "substack",
    ],
    strong: [
      "subscription", "membership", "annual plan", "monthly plan",
      "premium", "pro plan", "cloud storage", "saas", "recurring",
      "auto-renewal", "auto renewal", "yearly plan",
    ],
    partial: [
      "plan", "upgrade",
    ],
  },

  {
    category: "Groceries",
    type: "expense",
    merchants: [
      "bigbasket", "blinkit", "zepto", "instamart", "swiggy instamart",
      "dunzo", "jiomart", "grofers", "nature's basket", "godrej nature's",
      "spencer's", "more supermarket", "star bazaar", "easy day",
      "reliance fresh", "heritage fresh", "ratnadeep", "spar",
      "metro cash and carry", "walmart grocery", "whole foods",
      "trader joe", "aldi", "lidl", "kroger", "safeway",
    ],
    strong: [
      "grocery", "supermarket", "vegetables", "fruits", "milk",
      "bread", "eggs", "rice", "dal", "atta", "flour", "oil",
      "sugar", "spices", "masala", "ghee", "butter", "cheese",
      "curd", "yogurt", "paneer", "tofu", "pulses", "lentils",
      "cereal", "oats", "muesli", "dry fruits", "nuts",
      "frozen food", "canned food", "snacks", "biscuits", "chips",
      "noodles", "pasta", "sauce", "ketchup", "pickle",
      "jam", "honey", "peanut butter", "detergent", "soap",
      "shampoo", "toothpaste", "tissue", "napkin", "cleaning",
    ],
    partial: [
      "fresh", "organic", "provision", "kirana", "ration",
    ],
  },

  {
    category: "Personal Care",
    type: "expense",
    merchants: [
      "nykaa", "purpller", "sugar cosmetics", "lakme", "loreal",
      "maybelline", "mac", "forest essentials", "bath and body works",
      "the body shop", "kama ayurveda", "man matters", "beardo",
      "bombay shaving company", "ustraa", "urbanic",
    ],
    strong: [
      "salon", "parlour", "parlor", "spa", "haircut", "beauty",
      "cosmetics", "skincare", "perfume", "grooming", "laundry",
      "dry clean", "tailor", "alteration", "manicure", "pedicure",
      "facial", "massage", "waxing", "threading", "tattoo",
      "piercing", "hair color", "hair dye", "styling",
      "makeup", "lipstick", "foundation", "moisturizer", "sunscreen",
      "serum", "face wash", "body wash", "lotion", "deodorant",
      "fragrance", "cologne", "shaving", "razor", "trimmer",
    ],
    partial: [
      "self care", "self-care", "personal", "groom",
    ],
  },

  // ── Income Categories ───────────────────────────────────

  {
    category: "Salary",
    type: "income",
    merchants: [],
    strong: [
      "salary", "payroll", "wage", "stipend", "payout",
      "credit salary", "monthly pay", "compensation", "net pay",
      "gross pay", "take home", "pay slip", "payslip",
      "salary credit", "sal credit", "sal cr",
    ],
    partial: [
      "credited", "pay",
    ],
  },

  {
    category: "Freelance",
    type: "income",
    merchants: [
      "upwork", "fiverr", "toptal", "freelancer.com", "guru.com",
      "peopleperhour", "99designs",
    ],
    strong: [
      "freelance", "consulting", "contract", "gig", "project payment",
      "client payment", "invoice", "professional fee", "service charge",
      "consultation fee", "advisory", "retainer",
    ],
    partial: [
      "commission", "honorarium",
    ],
  },

  {
    category: "Investment Returns",
    type: "income",
    merchants: [
      "zerodha", "groww", "upstox", "angel one", "motilal oswal",
      "hdfc securities", "icici direct", "kotak securities",
      "paytm money", "kuvera", "coin", "smallcase", "et money",
      "mutual fund", "sbi mf", "hdfc mf", "axis mf",
    ],
    strong: [
      "dividend", "interest", "mutual fund", "returns", "capital gain",
      "profit", "trading", "stock", "share", "bond", "fd interest",
      "rd interest", "sip", "investment", "portfolio", "equity",
      "debenture", "coupon payment", "maturity", "redemption",
      "interest earned", "int credit", "interest credit",
    ],
    partial: [
      "yield", "appreciation", "payout",
    ],
  },

  {
    category: "Business Income",
    type: "income",
    merchants: [],
    strong: [
      "business", "revenue", "sales", "turnover", "receivable",
      "invoice paid", "client transfer", "business income",
      "merchant settlement", "settlement", "vendor payment received",
    ],
    partial: [
      "receipt", "collection",
    ],
  },

  {
    category: "Rental Income",
    type: "income",
    merchants: [],
    strong: [
      "rental income", "rent received", "tenant payment", "lease income",
      "property income", "rent credit", "house rent",
    ],
    partial: [],
  },

  {
    category: "Gifts Received",
    type: "income",
    merchants: [],
    strong: [
      "gift", "birthday", "wedding", "reward", "cashback",
      "bonus", "prize", "won", "lottery", "lucky draw",
      "cash prize", "award", "incentive", "gratuity",
      "cash gift", "shagun", "gift money",
    ],
    partial: [
      "present", "celebration",
    ],
  },

  {
    category: "Refund",
    type: "income",
    merchants: [],
    strong: [
      "refund", "reversal", "return", "chargeback", "credit back",
      "cancelled", "canceled", "reimbursement", "reimburse",
      "money back", "cashback credit", "refund credit",
      "order cancelled", "trip cancelled", "booking cancelled",
    ],
    partial: [
      "reversal", "adjustment",
    ],
  },
]

// ─── Pre-compiled Rules ─────────────────────────────────────
// Built once at module load for fast matching.

const compiledRules: KeywordRule[] = []

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

for (const kw of CATEGORY_KEYWORDS) {
  // Merchants: exact match, highest confidence
  for (const merchant of kw.merchants) {
    compiledRules.push({
      pattern: new RegExp(`\\b${escapeRegex(merchant)}\\b`, "i"),
      category: kw.category,
      type: kw.type,
      confidence: 1.0,
    })
  }
  // Strong keywords
  for (const word of kw.strong) {
    compiledRules.push({
      pattern: new RegExp(`\\b${escapeRegex(word)}\\b`, "i"),
      category: kw.category,
      type: kw.type,
      confidence: 0.8,
    })
  }
  // Partial/ambiguous keywords
  for (const word of kw.partial) {
    compiledRules.push({
      pattern: new RegExp(`\\b${escapeRegex(word)}\\b`, "i"),
      category: kw.category,
      type: kw.type,
      confidence: 0.6,
    })
  }
}

// ─── Special Pattern Detectors ──────────────────────────────

const UPI_PATTERN = /UPI[-/](?:CR|DR)?[/-]?(\w+)/i
const NEFT_PATTERN = /(?:NEFT|IMPS|RTGS)[/-]?\w*[/-]?([A-Za-z\s]+)/i
const ATM_PATTERN = /\bATM\b.*(?:withdrawal|wdl|w\/d|cash)/i
const ATM_SIMPLE = /\bATM\b/i
const EMI_PATTERN = /\bEMI\b/i
const HOME_LOAN_PATTERN = /\b(?:home\s*loan|housing\s*loan|mortgage)\b/i
const CAR_LOAN_PATTERN = /\b(?:car\s*loan|vehicle\s*loan|auto\s*loan)\b/i
const SALARY_CREDIT_PATTERN = /\b(?:sal\s*(?:cr|credit)|salary\s*(?:cr|credit)|payroll|neft\s*salary)\b/i

// Income indicator patterns
const INCOME_PATTERNS = [
  /\bcredit(?:ed)?\b/i,
  /\breceived\b/i,
  /\bincoming\b/i,
  /\binward\b/i,
  /\bcr\b/i,
  SALARY_CREDIT_PATTERN,
  /\b(?:refund|reversal|cashback|reimburs)\b/i,
  /\b(?:dividend|interest\s*(?:credit|earned)|maturity)\b/i,
]

// Expense indicator patterns
const EXPENSE_PATTERNS = [
  /\bdebit(?:ed)?\b/i,
  /\bpaid\b/i,
  /\bpurchase\b/i,
  /\bbought\b/i,
  /\bspent\b/i,
  /\bdr\b/i,
  /\bwithdra?w(?:al|n)?\b/i,
  /\b(?:payment|paid to|transfer to)\b/i,
]

// ─── Helper: Extract UPI Merchant ───────────────────────────

function extractUPIMerchant(description: string): string | null {
  const match = description.match(UPI_PATTERN)
  if (match && match[1]) {
    return match[1].trim()
  }
  return null
}

// ─── Helper: Extract NEFT/IMPS/RTGS Counterparty ───────────

function extractTransferCounterparty(description: string): string | null {
  const match = description.match(NEFT_PATTERN)
  if (match && match[1]) {
    return match[1].trim()
  }
  return null
}

// ─── Core Matching Logic ────────────────────────────────────

function findBestMatch(
  text: string,
  typeFilter?: TransactionType
): CategorizationResult | null {
  let bestCategory: string | null = null
  let bestConfidence = 0

  for (const rule of compiledRules) {
    // If a type filter is provided, only consider matching types
    if (typeFilter && rule.type !== typeFilter) continue

    if (rule.confidence <= bestConfidence) continue

    if (rule.pattern.test(text)) {
      bestCategory = rule.category
      bestConfidence = rule.confidence

      // Early exit on perfect match
      if (bestConfidence >= 1.0) break
    }
  }

  if (bestCategory) {
    return { category: bestCategory, confidence: bestConfidence }
  }
  return null
}

// ─── Amount-based Heuristics ────────────────────────────────

function guessFromAmount(
  amount: number,
  type?: TransactionType
): CategorizationResult | null {
  // Large round amounts on the 1st of month could be salary or rent
  if (amount >= 10000 && amount % 1000 === 0) {
    if (type === "income") {
      return { category: "Salary", confidence: 0.3 }
    }
    if (type === "expense") {
      return { category: "Rent & Housing", confidence: 0.3 }
    }
  }
  return null
}

// ─── Main Export: autoCategorize ─────────────────────────────

export function autoCategorize(
  description: string,
  amount: number,
  type?: TransactionType
): CategorizationResult {
  const text = description.trim()
  if (!text) {
    const fallbackCategory = type === "income" ? "Other Income" : "Other"
    return { category: fallbackCategory, confidence: 0 }
  }

  // 1. Handle special banking patterns first

  // ATM withdrawals
  if (ATM_PATTERN.test(text) || ATM_SIMPLE.test(text)) {
    return { category: "Other", confidence: 0.8 }
  }

  // Salary credits
  if (SALARY_CREDIT_PATTERN.test(text)) {
    return { category: "Salary", confidence: 1.0 }
  }

  // EMI patterns — categorize by loan type
  if (EMI_PATTERN.test(text)) {
    if (HOME_LOAN_PATTERN.test(text)) {
      return { category: "Rent & Housing", confidence: 0.8 }
    }
    if (CAR_LOAN_PATTERN.test(text)) {
      return { category: "Transportation", confidence: 0.8 }
    }
    return { category: "Bills & Utilities", confidence: 0.6 }
  }

  // 2. Extract merchant from UPI references and try matching that too
  const upiMerchant = extractUPIMerchant(text)
  const neftCounterparty = extractTransferCounterparty(text)

  // Build list of texts to search: original + extracted parts
  const textsToSearch = [text]
  if (upiMerchant) textsToSearch.push(upiMerchant)
  if (neftCounterparty) textsToSearch.push(neftCounterparty)

  // 3. Try keyword matching across all text variants
  let bestResult: CategorizationResult | null = null

  for (const searchText of textsToSearch) {
    const result = findBestMatch(searchText, type)
    if (result && (!bestResult || result.confidence > bestResult.confidence)) {
      bestResult = result
    }
    // Also try without type filter if no match found with filter
    if (!bestResult && type) {
      const unfiltered = findBestMatch(searchText)
      if (unfiltered && (!bestResult || unfiltered.confidence > bestResult.confidence)) {
        bestResult = unfiltered
      }
    }
  }

  if (bestResult) {
    return bestResult
  }

  // 4. Fall back to amount-based heuristics
  const amountGuess = guessFromAmount(amount, type)
  if (amountGuess) {
    return amountGuess
  }

  // 5. No match at all
  const fallbackCategory = type === "income" ? "Other Income" : "Other"
  return { category: fallbackCategory, confidence: 0 }
}

// ─── Export: autoDetectType ─────────────────────────────────

export function autoDetectType(
  description: string,
  amount: number
): TransactionType {
  const text = description.trim()

  // Salary credits are always income
  if (SALARY_CREDIT_PATTERN.test(text)) {
    return "income"
  }

  // ATM is always expense
  if (ATM_PATTERN.test(text) || ATM_SIMPLE.test(text)) {
    return "expense"
  }

  // Check income indicator patterns
  let incomeScore = 0
  for (const pattern of INCOME_PATTERNS) {
    if (pattern.test(text)) incomeScore++
  }

  // Check expense indicator patterns
  let expenseScore = 0
  for (const pattern of EXPENSE_PATTERNS) {
    if (pattern.test(text)) expenseScore++
  }

  // Also check keyword rules — if best match is income category, lean income
  const incomeMatch = findBestMatch(text, "income")
  const expenseMatch = findBestMatch(text, "expense")

  if (incomeMatch && (!expenseMatch || incomeMatch.confidence > expenseMatch.confidence)) {
    incomeScore += 2
  }
  if (expenseMatch && (!incomeMatch || expenseMatch.confidence > incomeMatch.confidence)) {
    expenseScore += 2
  }

  if (incomeScore > expenseScore) return "income"
  if (expenseScore > incomeScore) return "expense"

  // Default: most transactions are expenses
  return "expense"
}
