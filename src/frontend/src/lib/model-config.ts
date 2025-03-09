import type { ModelConfig } from "@shared/schema";

export interface ModelProvider {
  id: string;
  name: string;
  models: {
    id: string;
    name: string;
    contextWindow?: number;
    pricing?: {
      input: number;
      output: number;
    };
  }[];
}

// Model configurations for different providers
export const MODEL_CONFIGS: Record<string, ModelProvider> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        contextWindow: 128000,
        pricing: {
          input: 0.000005,
          output: 0.000015
        }
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        contextWindow: 128000,
        pricing: {
          input: 0.000002,
          output: 0.000006
        }
      },
      {
        id: "gpt-4-turbo",
        name: "GPT-4 Turbo",
        contextWindow: 128000,
        pricing: {
          input: 0.00001,
          output: 0.00003
        }
      },
      {
        id: "gpt-4-0125-preview",
        name: "GPT-4 Preview",
        contextWindow: 128000,
        pricing: {
          input: 0.00001,
          output: 0.00003
        }
      },
      {
        id: "gpt-4-1106-preview",
        name: "GPT-4 Turbo (1106)",
        contextWindow: 128000,
        pricing: {
          input: 0.00001,
          output: 0.00003
        }
      },
      {
        id: "gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        contextWindow: 16000,
        pricing: {
          input: 0.0000005,
          output: 0.0000015
        }
      },
      {
        id: "gpt-3.5-turbo-16k",
        name: "GPT-3.5 Turbo (16K)",
        contextWindow: 16000,
        pricing: {
          input: 0.000001,
          output: 0.000002
        }
      }
    ]
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    models: [
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        contextWindow: 200000,
        pricing: {
          input: 0.000003,
          output: 0.000015
        }
      },
      {
        id: "claude-3-5-haiku-20241022",
        name: "Claude 3.5 Haiku",
        contextWindow: 200000,
        pricing: {
          input: 0.00000025,
          output: 0.00000125
        }
      },
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        contextWindow: 200000,
        pricing: {
          input: 0.00001,
          output: 0.00003
        }
      },
      {
        id: "claude-3-sonnet-20240229",
        name: "Claude 3 Sonnet",
        contextWindow: 200000,
        pricing: {
          input: 0.000003,
          output: 0.000015
        }
      },
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        contextWindow: 200000,
        pricing: {
          input: 0.00000025,
          output: 0.00000125
        }
      }
    ]
  },
  google: {
    id: "google",
    name: "Google AI",
    models: [
      {
        id: "gemini-1.5-pro-002",
        name: "Gemini 1.5 Pro",
        contextWindow: 1000000,
        pricing: {
          input: 0.000007,
          output: 0.000007
        }
      },
      {
        id: "gemini-1.5-flash-002",
        name: "Gemini 1.5 Flash",
        contextWindow: 1000000,
        pricing: {
          input: 0.000001,
          output: 0.000003
        }
      },
      {
        id: "gemini-1.0-pro-002",
        name: "Gemini 1.0 Pro",
        contextWindow: 32000,
        pricing: {
          input: 0.0000008,
          output: 0.0000024
        }
      },
      {
        id: "gemini-1.0-pro-vision-001",
        name: "Gemini 1.0 Pro Vision",
        contextWindow: 32000,
        pricing: {
          input: 0.0000008,
          output: 0.0000024
        }
      }
    ]
  },
  groq: {
    id: "groq",
    name: "Groq",
    models: [
      {
        id: "llama3-70b-8192",
        name: "Llama 3 70B",
        contextWindow: 8192,
        pricing: {
          input: 0.0000006,
          output: 0.0000009
        }
      },
      {
        id: "llama3-8b-8192",
        name: "Llama 3 8B",
        contextWindow: 8192,
        pricing: {
          input: 0.0000002,
          output: 0.0000003
        }
      },
      {
        id: "mixtral-8x7b-32768",
        name: "Mixtral 8x7B",
        contextWindow: 32768,
        pricing: {
          input: 0.0000002,
          output: 0.0000003
        }
      },
      {
        id: "gemma2-9b-it",
        name: "Gemma 2 9B",
        contextWindow: 8192,
        pricing: {
          input: 0.0000002,
          output: 0.0000003
        }
      },
      {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B",
        contextWindow: 128000,
        pricing: {
          input: 0.0000006,
          output: 0.0000009
        }
      }
    ]
  }
};

// Default model configs for use in the application
export const defaultModelConfigs: ModelConfig[] = [
  {
    provider: "openai",
    model: "gpt-4o",
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
  },
  {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
  },
  {
    provider: "google",
    model: "gemini-1.5-pro-002",
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
  },
  {
    provider: "groq",
    model: "llama3-70b-8192",
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
  }
];

// Default configuration by provider and model
export const getDefaultConfig = (provider: string, modelId: string): ModelConfig => {
  const defaultValues = {
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1,
    apiKey: ""
  };

  return {
    provider: provider as "openai" | "anthropic" | "google" | "groq",
    model: modelId,
    ...defaultValues
  };
};

// Get available models for a specific provider
export const getModelsForProvider = (provider: string) => {
  return MODEL_CONFIGS[provider]?.models || [];
};

// Get pricing info for a specific model
export const getModelPricing = (provider: string, modelId: string) => {
  const model = MODEL_CONFIGS[provider]?.models.find(m => m.id === modelId);
  return model?.pricing;
};

// Calculate estimated cost
export const calculateEstimatedCost = (
  provider: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number => {
  const pricing = getModelPricing(provider, modelId);
  if (!pricing) return 0;
  
  return (inputTokens * pricing.input) + (outputTokens * pricing.output);
};

// Estimate number of tokens in text
export const estimateTokenCount = (text: string): number => {
  // Rough estimate: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
};