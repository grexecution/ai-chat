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
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

/**
 * Checks if a query likely needs web search
 * Uses a simple but effective approach
 */
function shouldPerformWebSearch(query: string): { shouldSearch: boolean; searchQuery: string } {
  const lowerQuery = query.toLowerCase()
  
  // Words that strongly indicate need for current information
  const currentInfoIndicators = [
    'weather', 'wetter', 'temperature', 'temperatur', 'forecast', 'vorhersage',
    'news', 'nachrichten', 'today', 'heute', 'current', 'aktuell',
    'now', 'jetzt', 'latest', 'neueste', 'recent', 'kürzlich',
    'price', 'preis', 'stock', 'aktie', 'score', 'spielstand',
    'happening', 'passiert', 'event', 'ereignis'
  ]
  
  // Check if query contains any indicator
  const needsSearch = currentInfoIndicators.some(indicator => lowerQuery.includes(indicator))
  
  // Questions about specific places/entities often need current info
  const hasLocation = /\b(in|at|near|bei|für|payerbach|rax)\b/i.test(query) || 
                      /\b(in|at|near|bei|für)\s+\w+/i.test(query)
  const isQuestion = query.includes('?') || 
                     /^(what|who|when|where|how|wie|was|wann|wo|warum)/i.test(query)
  
  return {
    shouldSearch: needsSearch || (hasLocation && isQuestion),
    searchQuery: query
  }
}

/**
 * OpenAI-compatible chat completions endpoint with Ollama backend and web search
 * 
 * @description
 * This endpoint:
 * 1. Validates user authentication
 * 2. Checks if web search is needed based on query content
 * 3. Performs web search and includes results in context
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
    const { messages, model, conversationId } = body

    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 })
    }

    const userId = session.user.id
    let currentConversationId = conversationId

    // Create new conversation if none exists
    if (!currentConversationId) {
      const firstUserMessage = messages.find(m => m.role === 'user')
      const title = firstUserMessage 
        ? firstUserMessage.content.split(' ').slice(0, 4).join(' ').slice(0, 50)
        : 'New Chat'

      const conversation = await prisma.conversation.create({
        data: {
          userId,
          title,
          model: model || 'llama3.2:latest',
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
    
    if (lastUserMessage.role === 'user') {
      const searchCheck = shouldPerformWebSearch(lastUserMessage.content)
      console.info(`[Web Search] Query: "${lastUserMessage.content}" - Needs search: ${searchCheck.shouldSearch}`)
      
      if (searchCheck.shouldSearch) {
        console.info(`[Web Search] Performing search for: "${searchCheck.searchQuery}"`)
        
        try {
          const results = await searchWeb(searchCheck.searchQuery, 5)
          
          if (results.length > 0) {
            searchResults = results.map((result, index) => ({
              id: `cite-${index + 1}`,
              title: result.title,
              url: result.url,
              snippet: result.snippet,
              usedInResponse: true
            }))
            
            searchContext = `\n\n=== CURRENT WEB SEARCH RESULTS ===\nQuery: "${searchCheck.searchQuery}"\nDate: ${new Date().toISOString().split('T')[0]}\n\n` +
              searchResults.map((cite, idx) => 
                `[${idx + 1}] ${cite.title}\n${cite.snippet}\nSource: ${cite.url}\n`
              ).join('\n') +
              '\n=== END OF SEARCH RESULTS ===\n\nIMPORTANT: Use these current search results to answer the user\'s question. The information above is current and accurate. Cite sources as [1], [2], etc.'
            
            console.info(`[Web Search] Found ${results.length} results`)
          } else {
            console.info(`[Web Search] No results found`)
          }
        } catch (searchError) {
          console.error('Search failed:', searchError)
        }
      }
    }

    // Prepare system prompt
    const systemMessage = {
      role: 'system' as const,
      content: searchContext 
        ? 'You are a helpful AI assistant with access to current web search results. Use the provided search results to give accurate, up-to-date information. Always cite your sources using [1], [2], etc. Do NOT say you cannot provide current information - you have the search results below.'
        : 'You are a helpful AI assistant. Provide concise, direct answers based on your knowledge.'
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
        model: model || 'llama3.2:latest',
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

    // Transform Ollama stream to OpenAI format
    let assistantContent = ''

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const decoder = new TextDecoder()
        
        try {
          const reader = ollamaResponse.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          let buffer = ''

          // Send metadata if new conversation
          if (!conversationId && currentConversationId) {
            const metadataChunk = {
              conversationId: currentConversationId,
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadataChunk)}\n\n`))
          }

          // Send citations if available
          if (searchResults.length > 0) {
            const citationsChunk = {
              citations: searchResults,
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(citationsChunk)}\n\n`))
          }

          // Process Ollama stream
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              // Persist assistant response with citations
              if (assistantContent.trim()) {
                const messageData: any = {
                  conversationId: currentConversationId as string,
                  role: 'assistant',
                  content: assistantContent.trim(),
                }
                
                if (searchResults.length > 0) {
                  messageData.metadata = {
                    citations: searchResults
                  }
                }
                
                await prisma.message.create({
                  data: messageData,
                })

                await prisma.conversation.update({
                  where: { id: currentConversationId as string },
                  data: { updatedAt: new Date() },
                })
              }

              // Send final chunk
              const finalChunk = {
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: model || 'llama3.2:latest',
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

            // Parse Ollama JSONL format
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

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
                      model: model || 'llama3.2:latest',
                      choices: [{
                        index: 0,
                        delta: { content: ollamaData.message.content },
                        finish_reason: ollamaData.done ? 'stop' : null
                      }]
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`))
                  }
                } catch (error) {
                  console.error('Error parsing Ollama response:', error)
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error)
          
          // Send error message
          const errorMessage = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model || 'llama3.2:latest',
            choices: [{
              index: 0,
              delta: { content: 'Sorry, I encountered an error processing your request.' },
              finish_reason: 'stop'
            }]
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
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