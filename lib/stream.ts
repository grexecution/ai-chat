/**
 * Converts Ollama chat response to OpenAI-compatible streaming format
 */

interface OllamaResponse {
  model: string
  created_at: string
  response: string
  done: boolean
}

interface OpenAIResponse {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason: string | null
  }>
}

/**
 * Transformer class for converting Ollama chat streams to OpenAI format
 * 
 * @description
 * Handles the real-time conversion of Ollama's JSONL streaming format
 * to OpenAI's Server-Sent Events (SSE) format for client compatibility
 */
export class OllamaToOpenAIStream {
  private encoder = new TextEncoder()
  private decoder = new TextDecoder()

  /**
   * Transforms an Ollama stream to OpenAI-compatible SSE format
   * 
   * @param ollamaStream - Raw stream from Ollama API
   * @returns Transformed stream in OpenAI SSE format
   * 
   * @description
   * - Buffers incomplete JSON lines
   * - Converts each Ollama response to OpenAI chunk format
   * - Handles role assignment for first chunk
   * - Sends [DONE] marker on completion
   */
  public transform(ollamaStream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    const encoder = this.encoder
    const decoder = this.decoder
    let isFirstChunk = true
    let buffer = ''

    return new ReadableStream({
      async start(controller) {
        const reader = ollamaStream.getReader()

        try {
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) {
              // Send final completion message
              const finalChunk: OpenAIResponse = {
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: 'llama3.2:1b',
                choices: [{
                  index: 0,
                  delta: {},
                  finish_reason: 'stop'
                }]
              }
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`))
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              break
            }

            // Decode and buffer the chunk
            buffer += decoder.decode(value, { stream: true })
            
            // Process complete lines
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // Keep the last incomplete line in buffer

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const ollamaData: OllamaResponse = JSON.parse(line)
                  
                  // Convert to OpenAI format
                  const openAIChunk: OpenAIResponse = {
                    id: `chatcmpl-${Date.now()}`,
                    object: 'chat.completion.chunk',
                    created: Math.floor(Date.now() / 1000),
                    model: ollamaData.model || 'llama3.2:1b',
                    choices: [{
                      index: 0,
                      delta: isFirstChunk 
                        ? { role: 'assistant', content: ollamaData.response }
                        : { content: ollamaData.response },
                      finish_reason: ollamaData.done ? 'stop' : null
                    }]
                  }

                  isFirstChunk = false
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`))
                  
                  if (ollamaData.done) {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                    return
                  }
                } catch (error) {
                  console.error('Error parsing Ollama response:', error, 'Line:', line)
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream processing error:', error)
          controller.error(error)
        }
      }
    })
  }
}

/**
 * Creates a complete OpenAI-formatted SSE stream from static content
 * 
 * @param content - Complete message content to stream
 * @returns ReadableStream in OpenAI SSE format
 * 
 * @description
 * Useful for error messages or cached responses that need to be
 * returned in streaming format for API consistency
 */
export function createOpenAIStreamResponse(content: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    start(controller) {
      // First chunk with role
      const firstChunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'llama3.2:1b',
        choices: [{
          index: 0,
          delta: { role: 'assistant', content: content },
          finish_reason: null
        }]
      }
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(firstChunk)}\n\n`))
      
      // Final chunk
      const finalChunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: 'llama3.2:1b',
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop'
        }]
      }
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    }
  })
}

/**
 * Simulates streaming text word-by-word with typing delay
 * 
 * @param text - Text to stream word by word
 * @returns ReadableStream with simulated typing effect
 * 
 * @description
 * Creates a realistic streaming experience by:
 * - Splitting text into words
 * - Sending each word with 50ms delay
 * - Maintaining OpenAI SSE format
 * Useful for demos or fallback responses
 */
export function streamText(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  
  return new ReadableStream({
    start(controller) {
      const words = text.split(' ')
      let index = 0
      
      const sendChunk = () => {
        if (index >= words.length) {
          // Send final chunk
          const finalChunk = {
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: 'llama3.2:1b',
            choices: [{
              index: 0,
              delta: {},
              finish_reason: 'stop'
            }]
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }
        
        const word = words[index]
        const isFirst = index === 0
        
        const chunk = {
          id: `chatcmpl-${Date.now()}`,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: 'llama3.2:1b',
          choices: [{
            index: 0,
            delta: isFirst 
              ? { role: 'assistant', content: word + (index < words.length - 1 ? ' ' : '') }
              : { content: word + (index < words.length - 1 ? ' ' : '') },
            finish_reason: null
          }]
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        index++
        
        setTimeout(sendChunk, 50) // Simulate typing delay
      }
      
      sendChunk()
    }
  })
}