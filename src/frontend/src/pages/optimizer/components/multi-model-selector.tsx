import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MODEL_CONFIGS, getDefaultConfig } from "@/lib/model-config";
import type { ModelConfig } from "../../../shared/schema";
import { Trash2, Plus, AlertTriangle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

interface MultiModelSelectorProps {
  onModelConfigsChange: (configs: ModelConfig[]) => void;
  initialSelectedModels?: ModelConfig[];
}

export function MultiModelSelector({ 
  onModelConfigsChange,
  initialSelectedModels = []
}: MultiModelSelectorProps) {
  const [selectedProviders, setSelectedProviders] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string[]>>({});
  const [selectedConfigs, setSelectedConfigs] = useState<ModelConfig[]>(initialSelectedModels);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected providers with any that may be already in the initial models
  useEffect(() => {
    // Default to having all providers enabled
    const allProviders = Object.keys(MODEL_CONFIGS).reduce((acc, provider) => {
      acc[provider] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    const defaultConfigs: ModelConfig[] = [];
    const providers = { ...allProviders };
    const models: Record<string, string[]> = {};
    const keys: Record<string, string> = {};
    
    // If we have initial models, use their information
    if (initialSelectedModels && initialSelectedModels.length > 0) {
      initialSelectedModels.forEach(config => {
        // Ensure provider is enabled
        providers[config.provider] = true;
        
        // Track selected models
        if (!models[config.provider]) {
          models[config.provider] = [];
        }
        
        if (!models[config.provider].includes(config.model)) {
          models[config.provider].push(config.model);
        }
        
        // Track API keys
        if (config.apiKey && !keys[config.provider]) {
          keys[config.provider] = config.apiKey;
        }
      });
      
      // Use the provided models
      defaultConfigs.push(...initialSelectedModels);
    } else {
      // If no initial models, select the first model from each provider by default
      Object.keys(MODEL_CONFIGS).forEach(provider => {
        if (MODEL_CONFIGS[provider].models.length > 0) {
          const defaultModel = MODEL_CONFIGS[provider].models[0].id;
          if (!models[provider]) {
            models[provider] = [];
          }
          models[provider].push(defaultModel);
          
          // Create a default config for this model
          const providerType = provider as "openai" | "anthropic" | "google" | "groq";
          const newConfig = getDefaultConfig(providerType, defaultModel);
          
          defaultConfigs.push(newConfig);
        }
      });
    }
    
    setSelectedProviders(providers);
    setSelectedModels(models);
    setApiKeys(keys);
    setSelectedConfigs(defaultConfigs);
    
    // Immediately call the change handler to update the parent component
    if (defaultConfigs.length > 0) {
      onModelConfigsChange(defaultConfigs);
    }
  }, []);

  // Handle provider toggle
  const handleProviderToggle = (provider: string, checked: boolean) => {
    setSelectedProviders(prev => ({ ...prev, [provider]: checked }));
    
    if (!checked) {
      // Remove models for this provider from selected configs
      setSelectedConfigs(prev => prev.filter(config => config.provider !== provider));
      
      // Keep the API key in case user re-enables the provider
      // But remove selected models
      const { [provider]: _, ...restModels } = selectedModels;
      setSelectedModels(restModels);
    } else {
      // Initialize empty array for selected models when provider is selected
      setSelectedModels(prev => ({ ...prev, [provider]: [] }));
    }
  };

  // Handle API key change
  const handleApiKeyChange = (provider: string, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
    
    // Update API key for all configs with this provider
    setSelectedConfigs(prev => 
      prev.map(config => 
        config.provider === provider ? { ...config, apiKey: key } : config
      )
    );
  };

  // Handle model toggle
  const handleModelToggle = (provider: string, modelId: string, checked: boolean) => {
    // Update selected models list
    const updatedSelectedModels = { ...selectedModels };
    
    if (checked) {
      // Add model to selected list
      updatedSelectedModels[provider] = [
        ...(updatedSelectedModels[provider] || []), 
        modelId
      ];
      
      // Add new config to selected configs
      const providerType = provider as "openai" | "anthropic" | "google" | "groq";
      const newConfig = {
        ...getDefaultConfig(providerType, modelId),
        apiKey: apiKeys[provider] || ''
      };
      
      setSelectedConfigs(prev => [...prev, newConfig]);
    } else {
      // Remove model from selected list
      updatedSelectedModels[provider] = 
        (updatedSelectedModels[provider] || []).filter(id => id !== modelId);
      
      // Remove config from selected configs
      setSelectedConfigs(prev => 
        prev.filter(config => !(config.provider === provider && config.model === modelId))
      );
    }
    
    setSelectedModels(updatedSelectedModels);
  };

  // Handle updating configs
  const handleUpdateConfigs = () => {
    if (selectedConfigs.length === 0) {
      setError("Please select at least one model");
      return;
    }
    
    setError(null);
    onModelConfigsChange(selectedConfigs);
  };

  // Handle removing a selected config
  const handleRemoveConfig = (provider: string, modelId: string) => {
    // Remove from selected configs
    setSelectedConfigs(prev => 
      prev.filter(config => !(config.provider === provider && config.model === modelId))
    );
    
    // Remove from selected models
    setSelectedModels(prev => ({
      ...prev,
      [provider]: (prev[provider] || []).filter(id => id !== modelId)
    }));
  };

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="providers">
          <AccordionTrigger className="font-medium">Select AI Models</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {Object.entries(MODEL_CONFIGS).map(([provider, config]) => (
                <div key={provider} className="space-y-2 border rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedProviders[provider] || false}
                      onCheckedChange={(checked) => handleProviderToggle(provider, checked as boolean)}
                      id={`provider-${provider}`}
                    />
                    <Label htmlFor={`provider-${provider}`} className="font-medium">
                      {config.name}
                    </Label>
                  </div>

                  {selectedProviders[provider] && (
                    <div className="ml-6 space-y-2">
                      <div>
                        <Label className="text-sm" htmlFor={`apikey-${provider}`}>API Key</Label>
                        <Input
                          id={`apikey-${provider}`}
                          type="password"
                          value={apiKeys[provider] || ""}
                          onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                          placeholder={`Enter ${config.name} API Key`}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Leave empty to use env variables
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm">Models</Label>
                        <ScrollArea className="h-40 rounded border p-2">
                          <div className="space-y-2">
                            {config.models.map((model) => (
                              <div key={model.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`model-${provider}-${model.id}`}
                                  checked={(selectedModels[provider] || []).includes(model.id)}
                                  onCheckedChange={(checked) => 
                                    handleModelToggle(provider, model.id, checked as boolean)
                                  }
                                />
                                <Label htmlFor={`model-${provider}-${model.id}`} className="text-sm">
                                  {model.name}
                                  {model.pricing && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      (${model.pricing.input}/1K in, ${model.pricing.output}/1K out)
                                    </span>
                                  )}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Selected Models Display */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Selected Models ({selectedConfigs.length})</Label>
        <div className="flex flex-wrap gap-2">
          {selectedConfigs.length > 0 ? (
            selectedConfigs.map((config, index) => {
              const modelInfo = MODEL_CONFIGS[config.provider]?.models.find(m => m.id === config.model);
              return (
                <Badge key={`${config.provider}-${config.model}-${index}`} variant="secondary" className="p-1.5 gap-1">
                  <span>{MODEL_CONFIGS[config.provider]?.name}: {modelInfo?.name || config.model}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                    onClick={() => handleRemoveConfig(config.provider, config.model)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground italic">No models selected</div>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button 
        onClick={handleUpdateConfigs}
        disabled={selectedConfigs.length === 0}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Update Selected Models
      </Button>
    </div>
  );
}