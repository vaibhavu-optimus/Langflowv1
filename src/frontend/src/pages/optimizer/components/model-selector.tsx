import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type ModelConfig } from "../../../shared/schema";
import { MODEL_CONFIGS, defaultModelConfigs } from "@/lib/model-config";
import { useState, useEffect } from "react";

interface ModelSelectorProps {
  value: ModelConfig;
  onChange: (config: ModelConfig) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  // Include all providers from MODEL_CONFIGS
  const availableProviders = Object.keys(MODEL_CONFIGS);
  
  // Track which parameters each provider supports
  const providerParameters = {
    openai: {
      temperature: true,
      maxTokens: true,
      topP: true,
      frequencyPenalty: true,
      presencePenalty: true
    },
    anthropic: {
      temperature: true,
      maxTokens: true,
      topP: true,
      topK: true
    },
    google: {
      temperature: true,
      maxTokens: true,
      topP: true,
      topK: true
    },
    groq: {
      temperature: true,
      maxTokens: true,
      topP: true
    }
  };
  
  // Force update when provider changes to ensure model is set correctly
  useEffect(() => {
    // If there's no model selected for the current provider, set the first one
    if (!value.model || !MODEL_CONFIGS[value.provider]?.models.some(m => m.id === value.model)) {
      const firstModel = MODEL_CONFIGS[value.provider]?.models[0]?.id || "";
      
      // Create a new configuration with appropriate defaults for the selected provider
      const newConfig = {
        ...value,
        provider: value.provider as "openai" | "anthropic" | "google" | "groq",
        model: firstModel,
      };
      
      onChange(newConfig);
    }
  }, [value.provider]);

  const handleProviderChange = (provider: string) => {
    const typedProvider = provider as "openai" | "anthropic" | "google" | "groq";
    const firstModel = MODEL_CONFIGS[typedProvider]?.models[0]?.id || "";
    
    // Create a completely new configuration when provider changes
    onChange({ 
      provider: typedProvider,
      model: firstModel,
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1,
      // Add any provider-specific parameters
      ...(typedProvider === "openai" ? { frequencyPenalty: 0, presencePenalty: 0 } : {}),
      ...(typedProvider === "anthropic" || typedProvider === "google" ? { topK: 40 } : {})
    });
  };

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <Label>Provider</Label>
      </div>

      <div className="space-y-2">
        <Select
          value={value.provider}
          onValueChange={handleProviderChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a provider" />
          </SelectTrigger>
          <SelectContent>
            {availableProviders.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {MODEL_CONFIGS[provider].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <Select
          value={value.model}
          onValueChange={(model) => onChange({ ...value, model })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {MODEL_CONFIGS[value.provider]?.models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Temperature - supported by all providers */}
        <div className="space-y-2">
          <Label>Temperature</Label>
          <Input
            type="number"
            min={0}
            max={2}
            step={0.1}
            value={value.temperature}
            onChange={(e) =>
              onChange({ ...value, temperature: parseFloat(e.target.value) })
            }
          />
        </div>

        {/* Max Tokens - supported by all providers */}
        <div className="space-y-2">
          <Label>Max Tokens</Label>
          <Input
            type="number"
            min={1}
            step={1}
            value={value.maxTokens}
            onChange={(e) =>
              onChange({ ...value, maxTokens: parseInt(e.target.value) })
            }
          />
        </div>

        {/* Top P - supported by all providers */}
        <div className="space-y-2">
          <Label>Top P</Label>
          <Input
            type="number"
            min={0}
            max={1}
            step={0.1}
            value={value.topP}
            onChange={(e) => onChange({ ...value, topP: parseFloat(e.target.value) })}
          />
        </div>
      </div>
      
      {/* Provider-specific parameters */}
      {value.provider === "openai" && (
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <Label>Frequency Penalty</Label>
            <Input
              type="number"
              min={-2}
              max={2}
              step={0.1}
              value={(value as any).frequencyPenalty || 0}
              onChange={(e) =>
                onChange({ ...value, frequencyPenalty: parseFloat(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Presence Penalty</Label>
            <Input
              type="number"
              min={-2}
              max={2}
              step={0.1}
              value={(value as any).presencePenalty || 0}
              onChange={(e) =>
                onChange({ ...value, presencePenalty: parseFloat(e.target.value) })
              }
            />
          </div>
        </div>
      )}
      
      {(value.provider === "anthropic" || value.provider === "google") && (
        <div className="space-y-2 mt-2">
          <Label>Top K</Label>
          <Input
            type="number"
            min={1}
            max={100}
            step={1}
            value={(value as any).topK || 40}
            onChange={(e) =>
              onChange({ ...value, topK: parseInt(e.target.value) })
            }
          />
        </div>
      )}
    </div>
  );
}
