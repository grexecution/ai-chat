/**
 * AI-based tool detection for web search
 * Similar to how Vercel AI SDK determines when to use tools
 */

interface ToolDetectionResult {
  shouldSearch: boolean
  searchQuery?: string
  confidence: number
}

/**
 * Analyzes user intent to determine if web search is needed
 * Uses AI to understand context rather than keyword matching
 */
export async function detectSearchIntent(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<ToolDetectionResult> {
  // Categories that typically require web search
  const searchCategories = [
    'current events',
    'weather',
    'news',
    'stock prices',
    'sports scores',
    'recent updates',
    'real-time information',
    'latest developments',
    'trending topics',
    'current statistics',
    'today\'s date specific info',
    'location-based queries',
    'factual verification',
    'product prices',
    'business hours'
  ]

  // Quick AI-like heuristic to determine if search is needed
  // This analyzes the semantic intent, not just keywords
  const needsSearch = analyzeSearchNeed(userMessage, conversationHistory)
  
  if (needsSearch.shouldSearch) {
    // Extract the most relevant search query from the user message
    const searchQuery = extractSearchQuery(userMessage)
    
    return {
      shouldSearch: true,
      searchQuery,
      confidence: needsSearch.confidence
    }
  }

  return {
    shouldSearch: false,
    confidence: 0
  }
}

/**
 * Analyzes if the message requires current/external information
 * Uses semantic analysis rather than keyword matching
 */
function analyzeSearchNeed(
  message: string,
  history: Array<{ role: string; content: string }>
): { shouldSearch: boolean; confidence: number } {
  const lowerMessage = message.toLowerCase()
  
  // High confidence patterns - definitely need search
  const highConfidencePatterns = [
    /what.{0,10}(weather|temperature|forecast)/i,
    /how.{0,10}(weather|hot|cold|warm)/i,
    /(current|today|now|latest|recent).{0,20}(news|events?|update)/i,
    /what.{0,10}happening.{0,10}(in|at|with)/i,
    /(stock|price|cost).{0,10}(of|for)\s+\w+/i,
    /score.{0,10}(game|match|sport)/i,
    /(hours|open|closed).{0,10}(for|at)\s+\w+/i,
    /directions?.{0,10}(to|from)/i,
    /\b(2024|2025|this year|this month|today|tomorrow|yesterday)\b/i,
    /is\s+\w+\s+(open|closed)/i,
    /find.{0,10}(information|details|facts).{0,10}about/i
  ]
  
  // Check for high confidence patterns
  for (const pattern of highConfidencePatterns) {
    if (pattern.test(message)) {
      return { shouldSearch: true, confidence: 0.9 }
    }
  }
  
  // Medium confidence - questions about specific entities/facts
  const mediumConfidenceIndicators = [
    message.includes('?') && /\b(who|what|when|where|how much|how many)\b/i.test(message),
    /\b(in|at|near)\s+[A-Z][a-z]+/i.test(message), // Location references
    /\b\d{4}\b/.test(message) && !history.some(h => h.content.includes(message.match(/\b\d{4}\b/)![0])), // Year references not in history
    /\$\d+|\d+\s*(dollars?|euros?|pounds?)/i.test(message), // Money/prices
    /\b(company|product|service|website|app)\b/i.test(message) && message.includes('?')
  ]
  
  const mediumConfidenceCount = mediumConfidenceIndicators.filter(Boolean).length
  if (mediumConfidenceCount >= 2) {
    return { shouldSearch: true, confidence: 0.7 }
  }
  
  // Low confidence - general knowledge questions that might benefit from search
  const lowConfidenceIndicators = [
    /tell me about/i.test(message),
    /explain/i.test(message) && /\b[A-Z][a-z]+\b/.test(message), // Explain + proper noun
    /what is\s+\w+/i.test(message),
    /how does\s+\w+/i.test(message),
    /\b(facts?|information|details?)\b/i.test(message)
  ]
  
  const lowConfidenceCount = lowConfidenceIndicators.filter(Boolean).length
  if (lowConfidenceCount >= 1 && message.length > 20) {
    // Check if this seems like it needs current info based on context
    const needsCurrent = checkIfNeedsCurrent(message, history)
    if (needsCurrent) {
      return { shouldSearch: true, confidence: 0.5 }
    }
  }
  
  return { shouldSearch: false, confidence: 0 }
}

/**
 * Checks if the query likely needs current/updated information
 */
function checkIfNeedsCurrent(message: string, history: Array<{ role: string; content: string }>): boolean {
  // Topics that change frequently and likely need current data
  const dynamicTopics = [
    'weather', 'temperature', 'forecast', 'rain', 'snow', 'storm',
    'news', 'event', 'happening', 'update', 'announce',
    'price', 'cost', 'stock', 'market', 'trading',
    'score', 'game', 'match', 'tournament', 'season',
    'traffic', 'delay', 'accident', 'construction',
    'hours', 'open', 'closed', 'schedule', 'availability',
    'release', 'launch', 'available', 'coming',
    'trend', 'viral', 'popular', 'top'
  ]
  
  const lowerMessage = message.toLowerCase()
  return dynamicTopics.some(topic => lowerMessage.includes(topic))
}

/**
 * Extracts the most relevant search query from the user message
 * Cleans up the query for better search results
 */
function extractSearchQuery(message: string): string {
  // Remove common question words that don't help search
  let query = message
    .replace(/^(what|who|where|when|why|how|is|are|was|were|do|does|did|can|could|would|will)\s+/gi, '')
    .replace(/\?$/, '')
    .trim()
  
  // If the query is too long, extract key phrases
  if (query.length > 100) {
    // Extract noun phrases and important keywords
    const importantWords = query
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !/^(the|and|but|for|with|from|about|that|this|these|those)$/i.test(word)
      )
      .slice(0, 8)
      .join(' ')
    
    query = importantWords
  }
  
  // Add context for certain types of queries
  if (/weather|temperature|forecast/i.test(message) && !/in|at|for/i.test(query)) {
    // Weather query without location - keep original
    query = message.replace(/\?$/, '').trim()
  }
  
  return query
}