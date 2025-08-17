import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { searchWeb, type Citation } from '@/lib/web-search'

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatCompletionRequest {
  messages: ChatMessage[]
  model: string
  conversationId?: string
  stream?: boolean
  enableWebSearch?: boolean
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

// Keywords that might indicate a need for web search
const SEARCH_TRIGGERS = [
  'latest', 'recent', 'current', 'today', 'news', 'update',
  'what is happening', 'search', 'find', 'look up', 'google',
  '2024', '2025', 'this year', 'this month', 'this week'
]

function shouldSearchWeb(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  return SEARCH_TRIGGERS.some(trigger => lowerMessage.includes(trigger))
}

/**
 * OpenAI-compatible chat completions endpoint with Ollama backend and web search
 * 
 * @description
 * This endpoint:
 * 1. Validates user authentication
 * 2. Checks if web search is needed based on the query
 * 3. Performs web search if needed and includes results in context
 * 4. Streams responses from Ollama in OpenAI format
 * 5. Persists messages and citations to database
 * 6. Auto-generates conversation titles from first message
 * 
 * @param req - Next.js request with chat messages and model
 * @returns SSE stream with OpenAI-formatted chunks
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body: ChatCompletionRequest = await req.json()
    const { messages, model, conversationId, enableWebSearch = true } = body

    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 })
    }

    const userId = session.user.id
    let currentConversationId = conversationId

    // Create new conversation if none exists
    if (!currentConversationId) {
      // Auto-generate title from first user message (3-4 words, max 50 chars)
      const firstUserMessage = messages.find(m => m.role === 'user')
      const title = firstUserMessage 
        ? firstUserMessage.content.split(' ').slice(0, 4).join(' ').slice(0, 50)
        : 'New Chat'

      const conversation = await prisma.conversation.create({
        data: {
          userId,
          title,
          model: model || 'llama3.2:3b',
        },
      })

      currentConversationId = conversation.id
    }

    // Save user message to database
    const lastUserMessage = messages[messages.length - 1]
    if (lastUserMessage.role === 'user') {
      await prisma.message.create({
        data: {
          conversationId: currentConversationId,
          role: 'user',
          content: lastUserMessage.content,
        },
      })
    }

    // Check if web search is needed
    let searchResults: Citation[] = []
    let searchContext = ''
    let isSearching = false
    
    if (enableWebSearch && lastUserMessage.role === 'user' && shouldSearchWeb(lastUserMessage.content)) {
      isSearching = true
      
      // Perform web search
      const results = await searchWeb(lastUserMessage.content, 5)
      
      if (results.length > 0) {
        // Convert to citations format
        searchResults = results.map((result, index) => ({
          id: `cite-${index + 1}`,
          title: result.title,
          url: result.url,
          snippet: result.snippet,
          usedInResponse: true
        }))
        
        // Create search context for the AI
        searchContext = `\n\nWeb Search Results for "${lastUserMessage.content}":\n` +
          searchResults.map((cite, idx) => 
            `[${idx + 1}] ${cite.title}\nURL: ${cite.url}\nSnippet: ${cite.snippet}\n`
          ).join('\n') +
          '\nPlease use these search results to provide an accurate and up-to-date response. Cite sources using [1], [2], etc. when referencing information from the search results.'
      }
    }

    // Add system prompt for concise responses
    const systemMessage = {
      role: 'system' as const,
      content: 'You are a helpful AI assistant. Provide concise, direct answers. Be brief unless the user asks for more detail.' + 
        (searchContext ? ' When web search results are provided, use them to give accurate, current information and cite your sources using [1], [2], etc.' : '')
    }
    
    // Prepare messages for Ollama
    const messagesForOllama = [
      systemMessage,
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }))
    ]
    
    // Add search context to the last user message if available
    if (searchContext && messagesForOllama.length > 1) {
      const lastMessage = messagesForOllama[messagesForOllama.length - 1]
      if (lastMessage.role === 'user') {
        lastMessage.content += searchContext
      }
    }

    // Make request to Ollama
    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'llama3.2:3b',
        messages: messagesForOllama,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        },
      }),
    })

    if (!ollamaResponse.ok) {
      console.error('Ollama API error:', ollamaResponse.status, await ollamaResponse.text())
      return new Response('AI service unavailable', { status: 503 })
    }

    // Transform Ollama stream to OpenAI format with citations
    let assistantContent = ''

    /**
     * Custom ReadableStream that:
     * 1. Converts Ollama format to OpenAI SSE format
     * 2. Accumulates assistant response for database persistence
     * 3. Sends conversation ID and citations for new conversations
     * 4. Handles streaming errors gracefully
     */
    const stream = new ReadableStream({
      async start(controller) {
        const reader = ollamaResponse.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        const encoder = new TextEncoder()
        const decoder = new TextDecoder()
        let buffer = ''

        // Send metadata in first chunk
        if (!conversationId && currentConversationId) {
          const metadataChunk = {
            conversationId: currentConversationId,
            isSearching: false,
            citations: searchResults
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadataChunk)}\n\n`))
        } else if (searchResults.length > 0) {
          // Send citations even for existing conversations
          const citationsChunk = {
            isSearching: false,
            citations: searchResults
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(citationsChunk)}\n\n`))
        }

        // If searching, send a status update
        if (isSearching) {
          const searchingChunk = {
            isSearching: true,
            searchMessage: 'Searching the web for current information...'
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(searchingChunk)}\n\n`))
        }

        try {
          // Process Ollama stream and convert to OpenAI format
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              // Persist complete assistant response to database with citations
              if (assistantContent.trim()) {
                const messageData: any = {
                  conversationId: currentConversationId as string,
                  role: 'assistant',
                  content: assistantContent.trim(),
                }
                
                // Add citations as metadata if available
                if (searchResults.length > 0) {
                  messageData.metadata = {
                    citations: searchResults
                  }
                }
                
                await prisma.message.create({
                  data: messageData,
                })

                // Update conversation timestamp
                await prisma.conversation.update({
                  where: { id: currentConversationId as string },
                  data: { updatedAt: new Date() },
                })
              }

              // Send final completion message
              const finalChunk = {
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model || 'llama3.2:3b',
                choices: [{
                  index: 0,
                  delta: {},
                  finish_reason: 'stop'
                }]
              }
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`))
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
              break
            }

            // Parse Ollama JSONL format and buffer incomplete lines
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const ollamaData = JSON.parse(line)
                  
                  if (ollamaData.message?.content) {
                    assistantContent += ollamaData.message.content

                    // Convert to OpenAI format
                    const openAIChunk = {
                      id: `chatcmpl-${Date.now()}`,
                      object: 'chat.completion.chunk',
                      created: Math.floor(Date.now() / 1000),
                      model: model || 'llama3.2:3b',
                      choices: [{
                        index: 0,
                        delta: { content: ollamaData.message.content },
                        finish_reason: ollamaData.done ? 'stop' : null
                      }]
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`))
                  }

                  if (ollamaData.done) {
                    break
                  }
                } catch (error) {
                  console.error('Error parsing Ollama response:', error)
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error)
          controller.error(error)
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Chat completions error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}