import React, { useState, useMemo, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Gauge, 
  LineChart, 
  Info, 
  Loader2, 
  RefreshCw, 
  Zap,
  Activity,
  DollarSign,
  Clock
} from 'lucide-react';
import { useFlowStore } from '../../../../../stores/flowstoreNew';
import { ModelArenaNodeData } from '../../../../../types/flowTypes';
import { MultiModelSelector } from '../../multi-model-selector';
import { useToast } from '../../../../../hooks/use-toast';
import { generateAIResponse } from '../../../../../lib/ai-providers';
import { formatScore } from '../../../../../lib/utils';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Mock StreamMetrics type for demonstration
interface StreamMetrics {
  startTime: number;
  endTime: number | null;
  tokenCount: number;
  estimatedCost: number;
}

// Mock ModelComparisonResult type for demonstration
interface ModelComparisonResult {
  modelConfig: any;
  response: string;
  metrics: StreamMetrics;
  isStreaming: boolean;
  streamProgress: number;
  error?: string;
}

// Model Arena Node component
const ModelArenaNode: React.FC<NodeProps<ModelArenaNodeData>> = ({ id, data }) => {
  const [selectedTab, setSelectedTab] = useState('0');
  const [modelResults, setModelResults] = useState<Record<string, ModelComparisonResult[]>>({});
  const [isComparing, setIsComparing] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<number>(0);
  const { updateNodeData } = useFlowStore();
  const { toast } = useToast();

  // Get variations and test cases
  const variations = data.variations || [];
  const testCases = useFlowStore.getState().getNodeByType('testCasesNode')?.data.testCases || [];

  // Update comparing state when data changes
  useEffect(() => {
    if (data.isComparing !== isComparing) {
      setIsComparing(data.isComparing);
    }
  }, [data.isComparing, isComparing]);

  // Handle model configuration change
  const handleModelConfigChange = (configs: any[]) => {
    updateNodeData(id, { activeModels: configs });
  };

  // Start model comparison
  const handleStartComparison = async (variationId: number) => {
    if (!data.activeModels || data.activeModels.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one model configuration',
        variant: 'destructive',
      });
      return;
    }

    if (testCases.length === 0) {
      toast({
        title: 'Error',
        description: 'No test cases available',
        variant: 'destructive',
      });
      return;
    }

    const testCase = testCases[selectedTestCase]?.input || 'Test input';
    const variationContent = variations.find(v => v.id === variationId)?.content || '';

    setIsComparing(true);
    updateNodeData(id, { isComparing: true });

    try {
      // Store results
      const results: ModelComparisonResult[] = [];

      // Process each model config
      for (const config of data.activeModels) {
        try {
          // Simulate start time
          const startTime = Date.now();
          
          // Call actual API (in real mode) or use simulation (in demo mode)
          const response = await generateAIResponse(variationContent, testCase, config);
          
          // Simulate end time and metrics
          const endTime = Date.now();
          const tokenCount = Math.ceil(response.length / 4);
          const processingDuration = endTime - startTime;
          const tokensPerSecond = tokenCount / (processingDuration / 1000);
          
          // Calculate cost (rough estimate)
          let estimatedCost = 0;
          if (config.provider === 'openai') {
            // OpenAI pricing estimates (very rough)
            if (config.model.includes('gpt-4')) {
              estimatedCost = tokenCount * 0.00001;
            } else {
              estimatedCost = tokenCount * 0.000002;
            }
          } else if (config.provider === 'anthropic') {
            // Anthropic pricing estimates
            if (config.model.includes('claude-3-opus')) {
              estimatedCost = tokenCount * 0.00003;
            } else {
              estimatedCost = tokenCount * 0.00001;
            }
          } else {
            // Generic estimate for other providers
            estimatedCost = tokenCount * 0.000005;
          }
          
          // Add to results
          results.push({
            modelConfig: config,
            response,
            metrics: {
              startTime,
              endTime,
              tokenCount,
              estimatedCost
            },
            isStreaming: false,
            streamProgress: 100
          });
        } catch (error) {
          // Handle errors for individual models
          results.push({
            modelConfig: config,
            response: '',
            metrics: {
              startTime: Date.now(),
              endTime: Date.now(),
              tokenCount: 0,
              estimatedCost: 0
            },
            isStreaming: false,
            streamProgress: 100,
            error: error instanceof Error ? error.message : 'An error occurred'
          });
        }
      }

      // Update model results
      setModelResults(prev => ({
        ...prev,
        [variationId.toString()]: results
      }));

      toast({
        title: 'Comparison Complete',
        description: `Compared ${data.activeModels.length} models for Variation ${variationId + 1}`,
      });
    } catch (error) {
      toast({
        title: 'Comparison Failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsComparing(false);
      updateNodeData(id, { isComparing: false });
    }
  };

  // Prepare metrics data for charts
  const metricsData = useMemo(() => {
    const activeTab = selectedTab;
    if (!modelResults[activeTab]) return [];

    return modelResults[activeTab].map(result => ({
      name: `${result.modelConfig.provider} - ${result.modelConfig.model}`,
      tokensPerSec: result.metrics.endTime ? 
        (result.metrics.tokenCount / ((result.metrics.endTime - result.metrics.startTime) / 1000)) : 0,
      cost: result.metrics.estimatedCost,
      tokens: result.metrics.tokenCount,
      time: result.metrics.endTime ? (result.metrics.endTime - result.metrics.startTime) / 1000 : 0
    }));
  }, [modelResults, selectedTab]);

  // Get evaluation results for the current variation
  const evaluationResults = useMemo(() => {
    if (!data.results || !variations.length) return null;
    
    const variationId = parseInt(selectedTab);
    const variationResults = data.results.filter(r => r.variationId === variationId);
    
    if (variationResults.length === 0) return null;
    
    // Calculate average score
    const avgScore = variationResults.reduce((sum, r) => sum + r.score, 0) / variationResults.length;
    
    return {
      averageScore: avgScore,
      results: variationResults
    };
  }, [data.results, selectedTab, variations.length]);

  return (
    <Card className="w-[500px] shadow-md">
      <CardHeader className="bg-primary/10 py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          Model Arena
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-2 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Compare how different models perform with your prompt variations. Test metrics like response quality, speed, and cost.
                </p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {variations.length > 0 ? (
          <>
            <Tabs defaultValue={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${variations.length}, 1fr)` }}>
                {variations.map((variation, index) => (
                  <TabsTrigger key={index} value={index.toString()}>
                    V{index + 1}
                    {evaluationResults && selectedTab === index.toString() && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {formatScore(evaluationResults.averageScore)}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {variations.map((variation, index) => (
                <TabsContent key={index} value={index.toString()} className="space-y-4">
                  {/* Variation Content */}
                  <div className="space-y-2">
                    <Label className="flex items-center">
                      Prompt Variation {index + 1}
                      {evaluationResults && selectedTab === index.toString() && (
                        <Badge variant="outline" className="ml-2">
                          Score: {formatScore(evaluationResults.averageScore)}/10
                        </Badge>
                      )}
                    </Label>
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <pre className="whitespace-pre-wrap text-sm font-mono overflow-auto max-h-40">
                        {variation.content.length > 200 
                          ? variation.content.substring(0, 200) + "..." 
                          : variation.content}
                      </pre>
                    </div>
                  </div>

                  {/* Test Case Selection */}
                  <div className="space-y-2">
                    <Label>Test Case</Label>
                    <Select 
                      value={selectedTestCase.toString()} 
                      onValueChange={(value) => setSelectedTestCase(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a test case" />
                      </SelectTrigger>
                      <SelectContent>
                        {testCases.map((testCase: { id: number; input: string }, idx: number) => (
                          <SelectItem key={testCase.id} value={idx.toString()}>
                            Test Case {idx + 1} ({testCase.input.substring(0, 30)}...)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <Label>Select Models for Testing</Label>
                    <MultiModelSelector
                      onModelConfigsChange={(configs) => handleModelConfigChange(configs)}
                    />
                  </div>

                  <Button
                    onClick={() => handleStartComparison(variation.id)}
                    disabled={isComparing || data.activeModels?.length === 0 || testCases.length === 0}
                    className="w-full"
                  >
                    {isComparing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing Models...
                      </>
                    ) : (
                      <>
                        <Gauge className="mr-2 h-4 w-4" />
                        Run Model Comparison
                      </>
                    )}
                  </Button>

                  {/* Results Display */}
                  {modelResults[index.toString()] && modelResults[index.toString()].length > 0 && (
                    <div className="space-y-4">
                      {/* Metrics Visualization */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            <span className="font-medium">Performance Metrics</span>
                          </div>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">Detailed View</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh]">
                              <DialogHeader>
                                <DialogTitle>Model Performance Metrics</DialogTitle>
                              </DialogHeader>
                              <Tabs defaultValue="speed">
                                <TabsList className="grid w-full grid-cols-3">
                                  <TabsTrigger value="speed">Speed</TabsTrigger>
                                  <TabsTrigger value="cost">Cost</TabsTrigger>
                                  <TabsTrigger value="time">Response Time</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="speed" className="h-[400px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metricsData}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                      <YAxis label={{ value: 'Tokens per Second', angle: -90, position: 'insideLeft' }} />
                                      <Tooltip formatter={(value: any) => [`${Number(value).toFixed(2)} tokens/sec`, 'Speed']} />
                                      <Legend />
                                      <Bar dataKey="tokensPerSec" name="Tokens/sec" fill="#8884d8" />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </TabsContent>
                                
                                <TabsContent value="cost" className="h-[400px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metricsData}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                      <YAxis label={{ value: 'Cost (USD)', angle: -90, position: 'insideLeft' }} />
                                      <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(5)}`, 'Cost']} />
                                      <Legend />
                                      <Bar dataKey="cost" name="Cost (USD)" fill="#82ca9d" />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </TabsContent>
                                
                                <TabsContent value="time" className="h-[400px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metricsData}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                                      <YAxis label={{ value: 'Response Time (sec)', angle: -90, position: 'insideLeft' }} />
                                      <Tooltip formatter={(value: any) => [`${Number(value).toFixed(2)} seconds`, 'Response Time']} />
                                      <Legend />
                                      <Bar dataKey="time" name="Response Time (sec)" fill="#ffc658" />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </TabsContent>
                              </Tabs>
                            </DialogContent>
                          </Dialog>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950 flex flex-col items-center">
                            <Zap className="h-4 w-4 mb-1 text-blue-500" />
                            <span className="text-xs font-medium mb-1">Fastest</span>
                            {metricsData.length > 0 && (
                              <>
                                <span className="text-sm font-semibold">
                                  {metricsData.sort((a, b) => b.tokensPerSec - a.tokensPerSec)[0].name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {metricsData.sort((a, b) => b.tokensPerSec - a.tokensPerSec)[0].tokensPerSec.toFixed(1)} tokens/sec
                                </span>
                              </>
                            )}
                          </div>
                          
                          <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950 flex flex-col items-center">
                            <DollarSign className="h-4 w-4 mb-1 text-green-500" />
                            <span className="text-xs font-medium mb-1">Cheapest</span>
                            {metricsData.length > 0 && (
                              <>
                                <span className="text-sm font-semibold">
                                  {metricsData.sort((a, b) => a.cost - b.cost)[0].name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ${metricsData.sort((a, b) => a.cost - b.cost)[0].cost.toFixed(5)}
                                </span>
                              </>
                            )}
                          </div>
                          
                          <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-950 flex flex-col items-center">
                            <Clock className="h-4 w-4 mb-1 text-amber-500" />
                            <span className="text-xs font-medium mb-1">Lowest Latency</span>
                            {metricsData.length > 0 && (
                              <>
                                <span className="text-sm font-semibold">
                                  {metricsData.sort((a, b) => a.time - b.time)[0].name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {metricsData.sort((a, b) => a.time - b.time)[0].time.toFixed(2)} seconds
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Model Responses */}
                      <div className="space-y-2">
                        <Label>Model Responses</Label>
                        <div className="grid grid-cols-1 gap-4 max-h-60 overflow-y-auto border rounded-lg p-3">
                          {modelResults[index.toString()].map((result, resultIndex) => (
                            <div key={resultIndex} className="border rounded-lg p-3 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  {result.modelConfig.provider} - {result.modelConfig.model}
                                </span>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {result.metrics.tokenCount} tokens
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    ${result.metrics.estimatedCost.toFixed(5)}
                                  </Badge>
                                </div>
                              </div>
                              
                              {result.error ? (
                                <div className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 p-3 rounded-md text-sm">
                                  Error: {result.error}
                                </div>
                              ) : (
                                <div className="bg-muted/50 p-2 rounded-md max-h-40 overflow-y-auto">
                                  <p className="text-sm whitespace-pre-wrap">
                                    {result.response}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>Run the evaluation first to compare model performance here.</p>
          </div>
        )}
      </CardContent>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 bg-primary"
      />
    </Card>
  );
};

export default ModelArenaNode;