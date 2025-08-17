import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
// import { OllamaToOpenAIStream } from '@/lib/stream' // Currently unused but available for future use

interface ChatMessage {
  role: 'user' | 'assistant'
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
 * OpenAI-compatible chat completions endpoint with Ollama backend
 * 
 * @description
 * This endpoint:
 * 1. Validates user authentication
 * 2. Creates or retrieves conversation context
 * 3. Streams responses from Ollama in OpenAI format
 * 4. Persists messages to database
 * 5. Auto-generates conversation titles from first message
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
      // Auto-generate title from first user message (3-4 words, max 50 chars)
      const firstUserMessage = messages.find(m => m.role === 'user')
      const title = firstUserMessage 
        ? firstUserMessage.content.split(' ').slice(0, 4).join(' ').slice(0, 50)
        : 'New Chat'

      const conversation = await prisma.conversation.create({
        data: {
          userId,
          title,
          model: model || 'llama3.2',
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

    // Add system prompt for concise responses
    const systemMessage = {
      role: 'system',
      content: 'You are a helpful AI assistant. Provide concise, direct answers. Be brief unless the user asks for more detail.'
    }
    
    const messagesWithSystem = [
      systemMessage,
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))
    ]

    // Make request to Ollama
    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'llama3.2',
        messages: messagesWithSystem,
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

    /**
     * Custom ReadableStream that:
     * 1. Converts Ollama format to OpenAI SSE format
     * 2. Accumulates assistant response for database persistence
     * 3. Sends conversation ID for new conversations
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

        // Send conversation ID in first chunk if it's a new conversation
        if (!conversationId && currentConversationId) {
          const infoChunk = {
            conversationId: currentConversationId,
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(infoChunk)}\n\n`))
        }

        try {
          // Process Ollama stream and convert to OpenAI format
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              // Persist complete assistant response to database
              if (assistantContent.trim()) {
                await prisma.message.create({
                  data: {
                    conversationId: currentConversationId as string,
                    role: 'assistant',
                    content: assistantContent.trim(),
                  },
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
                model: model || 'llama3.2',
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
                      model: model || 'llama3.2',
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