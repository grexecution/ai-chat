import axios from 'axios'
import * as cheerio from 'cheerio'

export interface SearchResult {
  title: string
  url: string
  snippet: string
  content?: string
}

export interface Citation {
  id: string
  title: string
  url: string
  snippet: string
  usedInResponse: boolean
}

/**
 * Performs web search using multiple fallback methods
 * Handles errors gracefully to prevent crashes
 */
export async function searchWeb(query: string, limit: number = 5): Promise<SearchResult[]> {
  console.log(`[Web Search] Searching for: "${query}"`)
  
  // Try multiple search methods with fallbacks
  const searchMethods = [
    () => searchWithDuckDuckGo(query, limit),
    () => searchWithBrave(query, limit),
    () => searchWithSearX(query, limit)
  ]
  
  for (const searchMethod of searchMethods) {
    try {
      const results = await searchMethod()
      if (results && results.length > 0) {
        console.log(`[Web Search] Found ${results.length} results`)
        return results
      }
    } catch (error) {
      console.warn('[Web Search] Search method failed, trying next...', error)
    }
  }
  
  console.log('[Web Search] All search methods failed, returning empty results')
  return []
}

/**
 * Search using DuckDuckGo HTML interface
 */
async function searchWithDuckDuckGo(query: string, limit: number): Promise<SearchResult[]> {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 8000,
      maxRedirects: 3,
      validateStatus: (status) => status < 500 // Accept 4xx as valid to handle gracefully
    })

    if (!response.data) {
      throw new Error('No response data from DuckDuckGo')
    }

    const $ = cheerio.load(response.data)
    const results: SearchResult[] = []

    // DuckDuckGo HTML result structure
    $('.result').each((index, element) => {
      if (index >= limit) return false
      
      const $element = $(element)
      const $title = $element.find('.result__title')
      const $snippet = $element.find('.result__snippet')
      const $url = $element.find('.result__url')
      
      const title = $title.text().trim()
      const snippet = $snippet.text().trim()
      let url = $url.text().trim()
      
      // Clean up the URL
      if (url && !url.startsWith('http')) {
        url = `https://${url}`
      }
      
      if (title && url && snippet) {
        results.push({
          title: title.substring(0, 200),
          url: url.substring(0, 500),
          snippet: snippet.substring(0, 500)
        })
      }
    })

    return results
  } catch (error) {
    console.error('[DuckDuckGo] Search failed:', error)
    throw error
  }
}

/**
 * Search using Brave Search (requires API key in production)
 * For now, using a mock/fallback
 */
async function searchWithBrave(query: string, limit: number): Promise<SearchResult[]> {
  // In production, you'd use Brave Search API
  // For now, we'll use a different approach
  try {
    // Alternative: Use a simple Google search scrape
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 8000
    })

    const $ = cheerio.load(response.data)
    const results: SearchResult[] = []

    // Google's result structure (simplified)
    $('div.g').each((index, element) => {
      if (index >= limit) return false
      
      const $element = $(element)
      const title = $element.find('h3').first().text().trim()
      const snippet = $element.find('.VwiC3b, .s, .st').first().text().trim()
      const url = $element.find('a').first().attr('href') || ''
      
      if (title && url && snippet) {
        results.push({
          title: title.substring(0, 200),
          url: url.substring(0, 500),
          snippet: snippet.substring(0, 500)
        })
      }
    })

    return results
  } catch (error) {
    console.error('[Brave/Google] Search failed:', error)
    throw error
  }
}

/**
 * Search using SearX instances (privacy-focused)
 */
async function searchWithSearX(query: string, limit: number): Promise<SearchResult[]> {
  const searxInstances = [
    'https://searx.be',
    'https://searx.info',
    'https://search.sapti.me'
  ]
  
  for (const instance of searxInstances) {
    try {
      const searchUrl = `${instance}/search?q=${encodeURIComponent(query)}&format=json&engines=google,duckduckgo`
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI Assistant; +https://example.com)',
          'Accept': 'application/json'
        },
        timeout: 5000
      })

      if (response.data && response.data.results) {
        return response.data.results.slice(0, limit).map((result: any) => ({
          title: (result.title || '').substring(0, 200),
          url: (result.url || '').substring(0, 500),
          snippet: (result.content || '').substring(0, 500)
        }))
      }
    } catch (error) {
      // Try next instance
      continue
    }
  }
  
  throw new Error('All SearX instances failed')
}

/**
 * Fetch and extract content from a webpage
 * With better error handling
 */
export async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000,
      maxContentLength: 1000000, // Limit to 1MB
      validateStatus: (status) => status < 500
    })

    if (!response.data) {
      return ''
    }

    const $ = cheerio.load(response.data)
    
    // Remove script and style elements
    $('script, style, nav, header, footer, iframe, noscript').remove()
    
    // Try to find main content areas
    const contentSelectors = [
      'main',
      'article', 
      '[role="main"]',
      '.content',
      '#content',
      '.post',
      '.entry-content',
      '.article-body'
    ]
    
    let content = ''
    for (const selector of contentSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        content = element.text()
        break
      }
    }
    
    // Fallback to body if no specific content area found
    if (!content) {
      content = $('body').text()
    }
    
    // Clean up the content
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .substring(0, 3000) // Limit content length
    
    return content
  } catch (error) {
    console.error('Failed to fetch page content:', error)
    return ''
  }
}