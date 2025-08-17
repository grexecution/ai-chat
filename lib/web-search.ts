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

// Using DuckDuckGo HTML search as it doesn't require API keys
export async function searchWeb(query: string, limit: number = 5): Promise<SearchResult[]> {
  try {
    // Use DuckDuckGo HTML search
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000
    })

    const $ = cheerio.load(response.data)
    const results: SearchResult[] = []

    $('.result').each((index, element) => {
      if (index >= limit) return false
      
      const $element = $(element)
      const title = $element.find('.result__title').text().trim()
      const url = $element.find('.result__url').text().trim()
      const snippet = $element.find('.result__snippet').text().trim()
      
      if (title && url && snippet) {
        results.push({
          title,
          url: url.startsWith('http') ? url : `https://${url}`,
          snippet
        })
      }
    })

    // If DuckDuckGo doesn't return results, try a fallback approach
    if (results.length === 0) {
      // Fallback to a simple Google search scraping
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
      const googleResponse = await axios.get(googleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000
      })

      const g$ = cheerio.load(googleResponse.data)
      g$('div.g').each((index, element) => {
        if (index >= limit) return false
        
        const $element = g$(element)
        const title = $element.find('h3').text().trim()
        const url = $element.find('a').attr('href') || ''
        const snippet = $element.find('.VwiC3b').text().trim()
        
        if (title && url && snippet) {
          results.push({
            title,
            url,
            snippet
          })
        }
      })
    }

    return results
  } catch (error) {
    console.error('Web search error:', error)
    // Return empty array on error - the AI will work without web results
    return []
  }
}

// Fetch and extract content from a webpage
export async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000,
      maxContentLength: 1000000 // Limit to 1MB
    })

    const $ = cheerio.load(response.data)
    
    // Remove script and style elements
    $('script, style, nav, header, footer').remove()
    
    // Extract main content
    const content = $('main, article, .content, #content, body')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000) // Limit content length
    
    return content
  } catch (error) {
    console.error('Failed to fetch page content:', error)
    return ''
  }
}