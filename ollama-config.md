# Ollama CPU Optimization Configuration

## Installed Models

### ⚖️ Model: LLaMA 3.2 3B  
- **Model ID**: `llama3.2:3b`
- **Size**: 2.0 GB
- **Context Window**: 128,000 tokens (massive!)
- **Best For**: Complex reasoning, coding, detailed explanations
- **Response Time**: ~6 seconds for complex queries
- **Characteristics**: Excellent accuracy, great for programming tasks

## Performance Test Results

### Simple Query Test (2+2)
- **LLaMA 3.2**: 1.85 seconds

### Complex Programming Task (Factorial Function)
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
- LLaMA 3.2: 128K tokens (excellent for long documents)

## Usage Recommendations

**For All Tasks**: Use LLaMA 3.2 (`llama3.2:3b`)
- Chat conversations
- Programming assistance
- Detailed explanations
- Long document analysis
- Complex reasoning

## Model Selection Strategy

The app uses LLaMA 3.2 for:
- High-quality code generation
- Accurate responses
- Long context handling
- Complex problem solving

## Quantization Notes

- **Q4_K_M quantization** provides the best balance of quality vs performance
- Only 3% quality loss compared to full precision
- 50% reduction in memory usage
- Significantly faster inference on CPU