import React, { useMemo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { 
  Trophy, 
  Info, 
  Download, 
  Copy, 
  ExternalLink,
  Check,
  Maximize2,
  ChevronDown,
  ChevronRight,
  MessageSquare
} from 'lucide-react';
import { useFlowStore } from '../../../../../stores/flowstoreNew';
import { ResultsNodeData } from '../../../../../types/flowTypes';
import { formatScore, calculateWeightedAverage, copyToClipboard, downloadAsJson } from '../../../../../lib/utils';
import { useToast } from '../../../../../hooks/use-toast';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "../../../../../components/ui/scroll-area";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

// Results Node component
const ResultsNode: React.FC<NodeProps<ResultsNodeData>> = ({ id, data }) => {
  const { toast } = useToast();
  
  // Calculate aggregated results
  const aggregatedResults = useMemo(() => {
    if (!data.variations || !data.evaluationResults || data.evaluationResults.length === 0) {
      return [];
    }

    return data.variations.map((variation) => {
      const variationResults = data.evaluationResults?.filter(
        (r) => r.variationId === variation.id
      );

      if (variationResults?.length === 0) {
        return null;
      }

      // Calculate scores per criterion
      const scores: Record<string, number> = {};
      const criteriaIds = [...new Set(variationResults.map((r) => r.criterionId))];
      
      criteriaIds.forEach((criterionId) => {
        const criterionResults = variationResults.filter((r) => r.criterionId === criterionId);
        if (criterionResults.length > 0) {
          const avgScore = criterionResults.reduce((sum, r) => sum + r.score, 0) / criterionResults.length;
          scores[criterionId.toString()] = avgScore;
        }
      });

      // Find best model pair
      const modelScores = new Map<string, number>();
      variationResults.forEach((result) => {
        const key = result.evaluatorModel;
        if (!modelScores.has(key)) {
          modelScores.set(key, 0);
        }
        modelScores.set(key, (modelScores.get(key) || 0) + result.score);
      });

      let bestScore = 0;
      let bestModel = "";
      modelScores.forEach((score, key) => {
        if (score > bestScore) {
          bestScore = score;
          bestModel = key;
        }
      });

      // Calculate weighted average
      // Get criteria from evaluation node
      const evaluationNode = useFlowStore.getState().getNodeByType('evaluationNode');
      const criteria = (evaluationNode?.data as EvaluationNodeData)?.criteria || [];
      
      // Map criterion weights
      const weights: Record<string, number> = {};
      criteria.forEach((criterion) => {
        weights[criterion.id.toString()] = criterion.weight;
      });

      // Get all the criteria names for display
      const criteriaNames: Record<string, string> = {};
      criteria.forEach((criterion) => {
        criteriaNames[criterion.id.toString()] = criterion.name;
      });

      return {
        variationId: variation.id,
        content: variation.content,
        averageScore: calculateWeightedAverage(scores, weights),
        scores,
        criteriaNames,
        bestModel: {
          model: bestModel,
          score: bestScore / variationResults.length
        }
      };
    }).filter(Boolean);
  }, [data.variations, data.evaluationResults]);

  // Sort by average score
  const sortedResults = useMemo(() => {
    return [...(aggregatedResults || [])].sort((a, b) => b.averageScore - a.averageScore);
  }, [aggregatedResults]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (sortedResults.length === 0) return [];
    
    return sortedResults.map((result) => {
      const chartItem: any = {
        name: `Variation ${result.variationId + 1}`,
        score: result.averageScore,
      };
      
      // Add criteria scores with proper names
      Object.entries(result.scores).forEach(([criterionId, score]) => {
        const criterionName = result.criteriaNames[criterionId] || `Criterion ${criterionId}`;
        chartItem[criterionName] = score;
      });
      
      return chartItem;
    });
  }, [sortedResults]);

  // Get criteria names for chart
  const criteriaNames = useMemo(() => {
    if (sortedResults.length === 0) return [];
    const firstResult = sortedResults[0];
    return Object.entries(firstResult.scores).map(([criterionId]) => 
      firstResult.criteriaNames[criterionId] || `Criterion ${criterionId}`
    );
  }, [sortedResults]);

  // Check if we have results to display
  const hasResults = data.evaluationResults && data.evaluationResults.length > 0;

  // Handle copy to clipboard
  const handleCopyContent = (content: string) => {
    copyToClipboard(content);
    toast({
      title: 'Copied',
      description: 'Content copied to clipboard',
    });
  };

  // Handle export results
  const handleExportResults = () => {
    if (!hasResults) {
      toast({
        title: 'No Results',
        description: 'There are no results to export',
        variant: 'destructive',
      });
      return;
    }

    const exportData = {
      variations: data.variations,
      testCases: data.testCases,
      evaluationResults: data.evaluationResults,
      aggregatedResults: sortedResults,
      exportedAt: new Date().toISOString()
    };

    downloadAsJson(exportData, 'prompt-evaluation-results.json');
    
    toast({
      title: 'Results Exported',
      description: 'Evaluation results exported as JSON',
    });
  };

  // Add this state
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  return (
    <Card className="w-[500px] shadow-md">
      <CardHeader className="bg-primary/10 py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          Evaluation Results
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-2 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Results of the evaluation showing which prompt variation performed best.
                </p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </CardTitle>
        
        {hasResults && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExportResults}
            title="Export results"
          >
            <Download className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {hasResults && sortedResults.length > 0 ? (
          <>
            {/* Best Performing Variation */}
            <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950 space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                <span className="font-bold text-lg">Best Performing Variation</span>
              </div>

              <div className="space-y-2">
                <div className="text-xl font-bold">
                  Variation {sortedResults[0].variationId + 1}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-lg">
                    Score: {formatScore(sortedResults[0].averageScore)}
                  </div>
                  <div className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded text-xs font-medium">
                    {formatScore(sortedResults[0].averageScore / 10 * 100)}%
                  </div>
                </div>
                <div className="text-muted-foreground flex items-center gap-2">
                  <span>Best with:</span>
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 px-2 py-0.5 rounded text-xs font-medium">
                    {sortedResults[0].bestModel.model}
                  </span>
                </div>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-2">
                      <Maximize2 className="h-4 w-4 mr-2" />
                      View Full Prompt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Best Performing Variation
                      </DialogTitle>
                    </DialogHeader>
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-medium">
                          Variation {sortedResults[0].variationId + 1}
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            (Score: {formatScore(sortedResults[0].averageScore)}/10)
                          </span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleCopyContent(sortedResults[0].content)}
                          className="flex items-center gap-1"
                        >
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </Button>
                      </div>
                      <div className="border rounded-lg p-3 bg-muted/30">
                        <pre className="whitespace-pre-wrap text-sm font-mono overflow-auto max-h-96">
                          {sortedResults[0].content}
                        </pre>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <div className="border rounded-lg p-3 bg-white dark:bg-muted mt-2">
                  <pre className="whitespace-pre-wrap text-sm font-mono overflow-auto max-h-40">
                    {sortedResults[0].content.length > 300 
                      ? sortedResults[0].content.substring(0, 300) + "..." 
                      : sortedResults[0].content}
                  </pre>
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Performance Comparison</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Expand
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>Performance Comparison</DialogTitle>
                    </DialogHeader>
                    <div className="h-[500px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis domain={[0, 10]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="score" fill="#8884d8" name="Overall Score" />
                          {criteriaNames.map((criterion, index) => (
                            <Bar
                              key={criterion}
                              dataKey={criterion}
                              fill={`hsl(${index * 40}, 70%, 50%)`}
                              name={criterion}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="h-[250px] border rounded-lg p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" fill="#8884d8" name="Overall Score" />
                    {criteriaNames.map((criterion, index) => (
                      <Bar
                        key={criterion}
                        dataKey={criterion}
                        fill={`hsl(${index * 40}, 70%, 50%)`}
                        name={criterion}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-2 border rounded-lg p-4">
              <div className="font-medium mb-4">All Variations</div>
              
              <Tabs defaultValue="table">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="table">Table View</TabsTrigger>
                  <TabsTrigger value="cards">Card View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="table" className="pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variation</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Best With</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedResults.map((result) => (
                        <TableRow key={result.variationId}>
                          <TableCell className="font-medium">
                            Variation {result.variationId + 1}
                            {sortedResults[0] === result && (
                              <span className="ml-2 inline-flex">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {formatScore(result.averageScore)}
                              <div className="bg-neutral-100 dark:bg-neutral-800 w-16 h-2 rounded overflow-hidden">
                                <div 
                                  className="bg-blue-500 h-full" 
                                  style={{ width: `${result.averageScore * 10}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{result.bestModel.model}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedResult(expandedResult === result.variationId ? null : result.variationId)}
                                title="View agent reasoning"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyContent(result.content)}
                                title="Copy variation"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                <TabsContent value="cards" className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sortedResults.map((result, index) => (
                      <div 
                        key={result.variationId} 
                        className={`border rounded-lg p-3 ${
                          index === 0 ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Variation {result.variationId + 1}</span>
                            {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyContent(result.content)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex justify-between text-sm mb-2">
                          <span>Score: {formatScore(result.averageScore)}/10</span>
                          <span className="text-xs text-muted-foreground">Best with: {result.bestModel.model}</span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground border rounded p-2 bg-white dark:bg-muted">
                          <div className="line-clamp-3 font-mono">
                            {result.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>No evaluation results yet. Run the evaluation to see results here.</p>
          </div>
        )}

        {/* After the TableBody, add this collapsible section */}
        {expandedResult !== null && (
          <div className="col-span-full p-4 bg-muted/20 border-t">
            <div className="space-y-4">
              <h4 className="font-medium">Evaluation Details for Variation {expandedResult + 1}</h4>
              <div className="space-y-2">
                {data.evaluationResults
                  .filter(r => r.variationId === expandedResult)
                  .slice(0, 3) // Show first 3 results
                  .map((result, idx) => {
                    const criterion = data.evaluationResults.find(r => r.criterionId === result.criterionId)?.response || '';
                    return (
                      <Collapsible key={idx} className="border rounded-md">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-muted">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 shrink-0 transition-transform ui-open:rotate-90" />
                            <span>Criterion: {result.criterionId}</span>
                            <Badge className="ml-2">{result.score.toFixed(1)}</Badge>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-3 pt-0 border-t">
                            <ScrollArea className="h-60">
                              <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap">
                                {result.response}
                              </div>
                            </ScrollArea>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                
                {data.evaluationResults.filter(r => r.variationId === expandedResult).length > 3 && (
                  <p className="text-sm text-center text-muted-foreground">
                    Showing 3 of {data.evaluationResults.filter(r => r.variationId === expandedResult).length} results
                  </p>
                )}
              </div>
            </div>
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
    </Card>
  );
};

export default ResultsNode;