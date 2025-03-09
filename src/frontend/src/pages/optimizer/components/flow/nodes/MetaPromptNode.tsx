import React, { useEffect, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, Info } from 'lucide-react';
import { useFlowStore } from '../../../../../stores/flowstoreNew';
import { MetaPromptNodeData } from '../../../../../types/flowTypes';
import { ModelSelector } from '../../model-selector';
import { generateVariations } from '../../../../../lib/ai-providers';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Meta Prompt Node component
const MetaPromptNode: React.FC<NodeProps<MetaPromptNodeData>> = ({ id, data }) => {
  const [generatedPrompt, setGeneratedPrompt] = useState(data.metaPrompt?.generatedPrompt || '');
  const [modelConfig, setModelConfig] = useState(data.modelConfig);
  const [error, setError] = useState<string | null>(null);
  const { updateNodeData } = useFlowStore();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Update local state when node data changes
  useEffect(() => {
    console.log("MetaPromptNode data:", { 
      metaPrompt: data.metaPrompt, 
      generatedPromptText: data.generatedPromptText,
      basePrompt: data.basePrompt,
      isGenerating: data.isGenerating,
      modelConfig: data.modelConfig,
    });
    
    // First check if data.metaPrompt.generatedPrompt exists (properly structured object)
    if (data.metaPrompt?.generatedPrompt) {
      console.log("Setting generated prompt from metaPrompt.generatedPrompt:", 
        typeof data.metaPrompt.generatedPrompt === 'string' 
          ? data.metaPrompt.generatedPrompt.substring(0, 30) + "..." 
          : "Invalid data");
      setGeneratedPrompt(data.metaPrompt.generatedPrompt);
    } 
    // Then check if we have a direct string in generatedPromptText (added for compatibility)
    else if (data.generatedPromptText) {
      console.log("Setting generated prompt from generatedPromptText:", 
        data.generatedPromptText.substring(0, 30) + "...");
      setGeneratedPrompt(data.generatedPromptText);
    }
    // Finally, try other possibilities (as a fallback)
    else {
      console.log("No valid generatedPrompt found in structured data. Looking for alternatives:", data);
      
      // Try to handle the case where data.metaPrompt might be a direct string
      const metaPromptValue = data.metaPrompt as unknown;
      if (metaPromptValue !== null && typeof metaPromptValue === 'string' && metaPromptValue.trim()) {
        console.log("Found direct string in metaPrompt, using it");
        setGeneratedPrompt(metaPromptValue);
      }
    }
    
    // Update loading state based on incoming props
    if (data.isGenerating !== undefined) {
      setIsGenerating(data.isGenerating);
    }
    
    if (data.modelConfig !== modelConfig) {
      setModelConfig(data.modelConfig);
    }
  }, [data.metaPrompt, data.generatedPromptText, data.modelConfig, modelConfig, data.isGenerating]);

  // Handle generate variations
  const handleGenerateVariations = async () => {
    // Get the meta prompt text from all possible sources
    let metaPromptText = '';
    
    // First try the structured metaPrompt object if it exists and has a generatedPrompt
    if (data.metaPrompt && typeof data.metaPrompt.generatedPrompt === 'string') {
      metaPromptText = data.metaPrompt.generatedPrompt;
      console.log('[Variations] Using generatedPrompt from metaPrompt object:', metaPromptText.substring(0, 30) + '...');
    } 
    // Then try the generatedPromptText backup field
    else if (typeof data.generatedPromptText === 'string' && data.generatedPromptText.trim()) {
      metaPromptText = data.generatedPromptText;
      console.log('[Variations] Using generatedPromptText field:', metaPromptText.substring(0, 30) + '...');
    }
    // Finally, try the displayed text as a last resort
    else if (generatedPrompt.trim()) {
      metaPromptText = generatedPrompt;
      console.log('[Variations] Using local state generatedPrompt:', metaPromptText.substring(0, 30) + '...');
    }
    
    // Validate we have a valid prompt before proceeding
    if (!metaPromptText.trim()) {
      const errorMessage = "No meta prompt content available to generate variations from";
      console.error('[Variations]', errorMessage);
      setError(errorMessage);
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Get variations node
      const variationsNode = useFlowStore.getState().getNodeByType('variationsNode');
      if (variationsNode) {
        // Update variations node to show it's loading
        updateNodeData(variationsNode.id, { isGenerating: true });
      }

      // Get the configuration to use
      const configToUse = data.modelConfig || 
        (data.metaPrompt && data.metaPrompt.modelConfig ? data.metaPrompt.modelConfig : {});

      console.log('[Variations] Sending to API:', {
        prompt: metaPromptText.substring(0, 50) + '...',
        configProvider: configToUse.provider,
        configModel: configToUse.model
      });

      // Generate variations from meta prompt  
      const variations = await generateVariations(
        metaPromptText, 
        configToUse
      );

      // Update variations node with generated content
      if (variationsNode) {
        // Create properly structured variation objects
        const promptVariations = variations.map((content, index) => ({
          id: index,
          metaPromptId: data.metaPrompt && data.metaPrompt.id ? data.metaPrompt.id : 0,
          content,
          modelConfig: configToUse
        }));

        updateNodeData(variationsNode.id, {
          metaPrompt: data.metaPrompt || { 
            id: Date.now(),
            basePrompt: data.basePrompt || "",
            generatedPrompt: metaPromptText,
            modelConfig: configToUse
          },
          variations: promptVariations,
          modelConfig: configToUse,
          isGenerating: false,
        });
      }

      toast({
        title: 'Success',
        description: 'Variations generated successfully',
      });
    } catch (error) {
      // Set error state
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during generation';
      setError(errorMessage);
      
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Reset variations node generation state
      const variationsNode = useFlowStore.getState().getNodeByType('variationsNode');
      if (variationsNode) {
        updateNodeData(variationsNode.id, { isGenerating: false });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle copy to clipboard
  const handleCopy = () => {
    copyToClipboard(generatedPrompt);
    toast({
      title: 'Copied',
      description: 'Meta prompt copied to clipboard',
    });
  };

  // Handle text update
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGeneratedPrompt(e.target.value);
    setError(null);
    
    // Update node data with edited meta prompt
    if (data.metaPrompt) {
      updateNodeData(id, {
        metaPrompt: {
          ...data.metaPrompt,
          generatedPrompt: e.target.value
        }
      });
    }
  };

  // Estimated token count (rough approx)
  const tokenCount = Math.ceil(generatedPrompt.length / 4);

  // Render debug information in development mode
  const renderDebugInfo = () => {
    // Only show in development mode
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-auto max-h-32">
        <div className="font-bold mb-1">Debug Info:</div>
        <div>Has metaPrompt object: {data.metaPrompt ? 'Yes' : 'No'}</div>
        <div>Has generatedPrompt: {data.metaPrompt?.generatedPrompt ? 'Yes' : 'No'}</div>
        <div>Has generatedPromptText: {data.generatedPromptText ? 'Yes' : 'No'}</div>
        <div>Content length: {generatedPrompt?.length || 0} chars</div>
        <div>State: {isGenerating ? 'Generating' : 'Ready'}</div>
        
        {/* Button to force update with mock data for testing */}
        <button 
          onClick={() => {
            const mockData = {
              id: Date.now(),
              basePrompt: 'Test prompt',
              generatedPrompt: 'This is a test meta prompt that should be displayed',
              modelConfig: data.modelConfig
            };
            setGeneratedPrompt(mockData.generatedPrompt);
            updateNodeData(id, { 
              metaPrompt: mockData,
              generatedPromptText: mockData.generatedPrompt
            });
          }}
          className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded"
        >
          Test with mock data
        </button>
      </div>
    );
  };

  return (
    <Card className="w-96 shadow-md">
      <CardHeader className="bg-primary/10 py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          Meta Prompt
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-2 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  This is the detailed system prompt generated from your base prompt. You can edit it before generating variations.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        {generatedPrompt && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {isGenerating ? (
          <div className="flex flex-col justify-center items-center h-40 gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Generating meta prompt...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {data.metaPrompt ? (
              <>
                <div className="space-y-2">
                  <Label>Generated Meta Prompt</Label>
                  <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="metaPrompt">Meta Prompt</Label>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={handleCopy}
                        title="Copy to clipboard"
                        className="h-6 px-2"
                        disabled={!generatedPrompt}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      id="metaPrompt"
                      placeholder={isGenerating 
                        ? "Generating meta prompt..." 
                        : "Generated meta prompt will appear here"}
                      value={generatedPrompt || ''} 
                      onChange={handleTextChange}
                      rows={10}
                      className={`font-mono text-sm ${error ? 'border-red-500' : ''}`}
                      disabled={isGenerating}
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      ~{tokenCount.toLocaleString()} tokens
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Model Configuration</Label>
                  <ModelSelector
                  value={modelConfig}
                  onChange={(newConfig) => {
                  console.log("🟡 ModelSelector Change Triggered:", newConfig); 
                  setModelConfig(newConfig);
                  updateNodeData(id, { modelConfig: newConfig }); 
              }}/>
                </div>

                <Button
                  onClick={handleGenerateVariations}
                  className="w-full"
                  disabled={!generatedPrompt.trim()}
                >
                  Generate Variations
                </Button>
              </>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>Enter a base prompt and click "Generate Meta Prompt" to get started.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="w-3 h-3 bg-primary"
      />

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output"
        className="w-3 h-3 bg-primary"
      />

      {/* Add debug info at the end */}
      {renderDebugInfo()}
    </Card>
  );
};

export default MetaPromptNode;