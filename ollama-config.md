# Ollama CPU Optimization Configuration

## Installed Models

### 🚀 Fast Model: Gemma 2 2B
- **Model ID**: `gemma2:2b`
- **Size**: 1.6 GB
- **Quantized Version**: `gemma2:2b-instruct-q4_K_M` (1.7 GB)
- **Best For**: Quick responses, simple queries, basic tasks
- **Response Time**: ~2.5 seconds for simple queries
- **Characteristics**: Ultra-fast, good for chat and simple coding tasks

### ⚖️ Balanced Model: LLaMA 3.2 3B  
- **Model ID**: `llama3.2:3b`
- **Size**: 2.0 GB
- **Context Window**: 128,000 tokens (massive!)
- **Best For**: Complex reasoning, coding, detailed explanations
- **Response Time**: ~6 seconds for complex queries
- **Characteristics**: Better accuracy, excellent for programming tasks

## Performance Test Results

### Simple Query Test (2+2)
- **Gemma 2**: 2.47 seconds
- **LLaMA 3.2**: 1.85 seconds

### Complex Programming Task (Factorial Function)
- **Gemma 2**: 12.04 seconds (verbose but correct)
- **LLaMA 3.2**: 6.23 seconds (clean and concise)

## CPU Optimization Settings

### Recommended Environment Variables
```bash
# Number of threads (adjust based on your CPU cores)
export OLLAMA_NUM_THREADS=4

# Keep models loaded in memory longer (in seconds)
export OLLAMA_KEEP_ALIVE=600

# Disable GPU if not available
export OLLAMA_GPU_LAYERS=0
```

### Context Window Settings
- Gemma 2: Default 8K tokens (sufficient for most tasks)
- LLaMA 3.2: 128K tokens (excellent for long documents)

## Usage Recommendations

1. **For Quick Interactions**: Use Gemma 2 (`gemma2:2b`)
   - Chat conversations
   - Simple questions
   - Basic code snippets
   - Real-time responses needed

2. **For Complex Tasks**: Use LLaMA 3.2 (`llama3.2:3b`)
   - Programming assistance
   - Detailed explanations
   - Long document analysis
   - Complex reasoning

## Model Selection Strategy

The app now defaults to Gemma 2 for speed, but users can switch to LLaMA 3.2 when they need:
- Better code quality
- More accurate responses
- Longer context handling
- Complex problem solving

## Quantization Notes

- **Q4_K_M quantization** provides the best balance of quality vs performance
- Only 3% quality loss compared to full precision
- 50% reduction in memory usage
- Significantly faster inference on CPU

