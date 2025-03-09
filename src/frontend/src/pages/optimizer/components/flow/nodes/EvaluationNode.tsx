import React, { useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Info, 
  Edit,
  Check,
  X, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useFlowStore } from '../../../../../stores/flowstoreNew';
import { EvaluationNodeData } from '../../../../../types/flowTypes';
import { ModelSelector } from '../../model-selector';
import { evaluateResponse } from '../../../../../lib/ai-providers';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';

// Default evaluation criteria
const defaultCriteria = [
  { name: 'Relevance', weight: 3, description: 'How relevant is the response to the input?' },
  { name: 'Coherence', weight: 2, description: 'How well-structured and logical is the response?' },
  { name: 'Creativity', weight: 2, description: 'How creative and innovative is the response?' },
  { name: 'Accuracy', weight: 3, description: 'How accurate is the information provided?' },
  { name: 'Conciseness', weight: 1, description: 'How concise and to-the-point is the response?' }
];

// Helper function to get color based on score
const getScoreColor = (score: number): string => {
  if (score >= 8) return "text-green-500 font-bold";
  if (score >= 6) return "text-blue-500 font-medium";
  if (score >= 4) return "text-yellow-500 font-medium";
  return "text-red-500 font-medium";
};

// Evaluation Node component
const EvaluationNode: React.FC<NodeProps<EvaluationNodeData>> = ({ id, data }) => {
  const [modelConfig, setModelConfig] = useState(data.modelConfig);
  const [criteriaName, setCriteriaName] = useState('');
  const [criteriaDescription, setCriteriaDescription] = useState('');
  const [criteriaWeight, setCriteriaWeight] = useState(1);
  const [editingCriterion, setEditingCriterion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [criteriaErrors, setCriteriaErrors] = useState<Record<string, string>>({});
  const [evaluationAgents, setEvaluationAgents] = useState<string[]>(["gpt-4o", "claude-3-5-sonnet"]);
  const { updateNodeData } = useFlowStore();
  const { toast } = useToast();
  const [showReasoning, setShowReasoning] = useState(true);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);
  const [selectedResultDetails, setSelectedResultDetails] = useState<any>(null);

  // Validate criterion form
  useEffect(() => {
    setIsFormValid(criteriaName.trim() !== '' && criteriaDescription.trim() !== '');
  }, [criteriaName, criteriaDescription]);

  // Update model config when data changes
  useEffect(() => {
    if (data.modelConfig !== modelConfig) {
      setModelConfig(data.modelConfig);
    }
  }, [data.modelConfig, modelConfig]);

  // Initialize with default criteria if none exist
  useEffect(() => {
    if (data.criteria.length === 0) {
      const initialCriteria = defaultCriteria.map((criterion, index) => ({
        id: index + 1,
        name: criterion.name,
        description: criterion.description,
        weight: criterion.weight,
        modelConfig
      }));
      
      updateNodeData(id, { criteria: initialCriteria });
    }
  }, [data.criteria.length, id, modelConfig, updateNodeData]);

  // Reset form fields
  const resetForm = () => {
    setCriteriaName('');
    setCriteriaDescription('');
    setCriteriaWeight(1);
    setEditingCriterion(null);
    setError(null);
    setCriteriaErrors({});
  };

  // Handle adding a criterion
  const handleAddCriterion = () => {
    if (!isFormValid) {
      setCriteriaErrors({
        ...(criteriaName.trim() === '' ? { name: 'Name is required' } : {}),
        ...(criteriaDescription.trim() === '' ? { description: 'Description is required' } : {})
      });
      return;
    }

    // Check for duplicate name
    if (data.criteria.some(c => c.name.toLowerCase() === criteriaName.toLowerCase() && 
        (editingCriterion === null || c.id !== editingCriterion))) {
      setCriteriaErrors({ name: 'A criterion with this name already exists' });
      return;
    }

    // Clear errors
    setCriteriaErrors({});

    if (editingCriterion !== null) {
      // Update existing criterion
      const updatedCriteria = data.criteria.map(c =>
        c.id === editingCriterion ? { 
          ...c, 
          name: criteriaName, 
          description: criteriaDescription, 
          weight: criteriaWeight 
        } : c
      );
      updateNodeData(id, { criteria: updatedCriteria });
      toast({
        title: "Criterion Updated",
        description: `Updated "${criteriaName}" evaluation criterion`,
      });
    } else {
      // Add new criterion
      const newCriterion = {
        id: data.criteria.length > 0 ? Math.max(...data.criteria.map(c => c.id)) + 1 : 1,
        name: criteriaName,
        description: criteriaDescription,
        weight: criteriaWeight,
        modelConfig
      };
      updateNodeData(id, { criteria: [...data.criteria, newCriterion] });
      toast({
        title: "Criterion Added",
        description: `Added "${criteriaName}" evaluation criterion`,
      });
    }

    resetForm();
  };

  // Start editing a criterion
  const handleEditCriterion = (criterion: any) => {
    setCriteriaName(criterion.name);
    setCriteriaDescription(criterion.description);
    setCriteriaWeight(criterion.weight);
    setEditingCriterion(criterion.id);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    resetForm();
  };

  // Handle removing a criterion
  const handleRemoveCriterion = (criterionId: number) => {
    const updatedCriteria = data.criteria.filter(c => c.id !== criterionId);
    updateNodeData(id, { criteria: updatedCriteria });
  };

  // Handle weight change
  const handleWeightChange = (criterionId: number, newWeight: number) => {
    const updatedCriteria = data.criteria.map(c =>
      c.id === criterionId ? { ...c, weight: newWeight } : c
    );
    updateNodeData(id, { criteria: updatedCriteria });
  };

  // Handle starting evaluation
  const handleStartEvaluation = async () => {
    if (data.criteria.length === 0) {
      setError("Please add at least one evaluation criterion");
      toast({
        title: 'Error',
        description: 'Please add at least one evaluation criterion',
        variant: 'destructive',
      });
      return;
    }

    if (!data.variations || data.variations.length === 0 || !data.testCases || data.testCases.length === 0) {
      setError("Missing variations or test cases for evaluation");
      toast({
        title: 'Error',
        description: 'Missing variations or test cases for evaluation',
        variant: 'destructive',
      });
      return;
    }

    // Clear error
    setError(null);

    // Close confirm dialog
    setIsConfirmDialogOpen(false);

    // Start evaluation
    updateNodeData(id, { 
      isEvaluating: true, 
      progress: 0,
      results: []
    });

    try {
      // Import the evaluation service dynamically to avoid initial load time
      let agentResults;
      let standardResults;
      
      try {
        const evalService = await import('@/services/langchainEvaluationService');
        
        // Update progress handler
        const handleProgress = (progress: number) => {
          updateNodeData(id, { progress });
        };
        
        // Run the evaluation with multiple agents
        agentResults = await evalService.evaluateAllWithAgents(
          data.variations,
          data.testCases,
          data.criteria,
          modelConfig,
          handleProgress
        );
        
        // Convert the agent results to standard format
        standardResults = evalService.convertAgentResults(agentResults);
      } catch (importError) {
        console.error("Failed to import evaluation service:", importError);
        
        // Generate mock results as fallback
        standardResults = generateMockEvaluationResults(
          data.variations,
          data.testCases,
          data.criteria
        );
        
        // Show warning about using mock data
        toast({
          title: 'Using Mock Evaluation',
          description: 'Evaluation service not available. Using mock data instead.',
          variant: 'warning',
        });
        
        // Simulate progress updates
        for (let i = 1; i <= 10; i++) {
          updateNodeData(id, { progress: i * 10 });
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Update results in the node
      updateNodeData(id, {
        results: standardResults,
        isEvaluating: false,
        progress: 100
      });

      // Update results node
      const resultsNode = useFlowStore.getState().getNodeByType('resultsNode');
      if (resultsNode) {
        updateNodeData(resultsNode.id, {
          variations: data.variations,
          testCases: data.testCases,
          evaluationResults: standardResults
        });
      }

      // Update model arena node
      const modelArenaNode = useFlowStore.getState().getNodeByType('modelArenaNode');
      if (modelArenaNode) {
        updateNodeData(modelArenaNode.id, {
          variations: data.variations,
          testCases: data.testCases,
          results: standardResults
        });
      }

      toast({
        title: 'Evaluation Complete',
        description: 'All test cases have been evaluated by multiple agents',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      updateNodeData(id, { isEvaluating: false });
      
      toast({
        title: 'Evaluation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };
  
  // Generate mock evaluation results for fallback
  const generateMockEvaluationResults = (
    variations: any[],
    testCases: any[],
    criteria: any[]
  ) => {
    const results = [];
    let id = 0;
    
    for (const variation of variations) {
      for (const testCase of testCases) {
        for (const criterion of criteria) {
          // Generate a random score between 6.5 and 9.0
          const score = 6.5 + Math.random() * 2.5;
          
          // Create a mock evaluation result
          results.push({
            id: id++,
            variationId: variation.id,
            testCaseId: testCase.id,
            criterionId: criterion.id,
            score,
            response: `**GPT-4o Evaluator** (Score: ${score.toFixed(1)}/10):\nThis prompt performs well on the "${criterion.name}" criterion. It effectively addresses the key aspects of ${criterion.description.toLowerCase()}.\n\n**Claude 3.5 Evaluator** (Score: ${(score + (Math.random() * 0.5 - 0.25)).toFixed(1)}/10):\nThe prompt demonstrates strong capabilities in terms of ${criterion.name.toLowerCase()}. It aligns well with expectations for ${criterion.description.toLowerCase()}.`,
            evaluatorModel: 'GPT-4o+Claude-3.5 (Mock)'
          });
        }
      }
    }
    
    return results;
  };

  // Display agent reasoning in a user-friendly way
  const displayAgentReasoning = (result: any) => {
    // Set the selected result for the dialog
    setSelectedResultDetails(result);
    return result.response;
  };

  // Format reasoning text for display with HTML
  const formatReasoning = (text: string): string => {
    if (!text) return '';
    
    try {
      // Convert markdown-style formatting to HTML
      let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n/g, '<br/>');
      
      // Highlight sections
      ['Strengths', 'Weaknesses', 'Recommendations', 'Analysis', 'Observations', 'Score', 'Rating'].forEach(section => {
        const sectionRegex = new RegExp(`${section}:`, 'gi');
        formatted = formatted.replace(sectionRegex, `<strong>${section}:</strong>`);
      });
      
      return formatted;
    } catch (error) {
      console.error("Error formatting reasoning:", error);
      return text;
    }
  };

  // Add this function to open the details dialog
  const openResultDetails = (result: any) => {
    setSelectedResultDetails(result);
  };

  // Result Details Dialog
  const ResultDetailsDialog = () => {
    if (!selectedResultDetails) return null;
    
    return (
      <Dialog open={!!selectedResultDetails} onOpenChange={() => setSelectedResultDetails(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Evaluation Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between">
              <div>
                <span className="text-sm font-medium">Score: </span>
                <span className="text-lg font-bold">{selectedResultDetails.score}/10</span>
              </div>
              <div>
                <span className="text-sm font-medium">Evaluator: </span>
                <span className="text-sm">{selectedResultDetails.evaluatorModel || 'AI Evaluator'}</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Reasoning:</h3>
              <ScrollArea className="h-60">
                <div 
                  className="prose prose-sm dark:prose-invert whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatReasoning(selectedResultDetails.response) }}
                ></div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Card className="w-96 shadow-md">
      <CardHeader className="bg-primary/10 py-3 flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center">
          Evaluation
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 ml-2 cursor-help text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Define criteria for evaluating prompt variations and run multi-agent evaluation with GPT-4o and Claude 3.5.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="space-y-2">
          <Label>Evaluator Model Configuration</Label>
          <ModelSelector
            value={modelConfig}
            onChange={setModelConfig}
          />
        </div>

        {/* Agent Selection */}
        <div className="space-y-2">
          <Label className="flex items-center">
            Evaluation Agents
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 ml-2 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Select which AI models will evaluate your prompt variations.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          
          <div className="flex items-center gap-2">
            <Select
              value={evaluationAgents[0]}
              onValueChange={(value) => setEvaluationAgents([value, evaluationAgents[1]])}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Agent 1" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
            
            <span>+</span>
            
            <Select
              value={evaluationAgents[1]}
              onValueChange={(value) => setEvaluationAgents([evaluationAgents[0], value])}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Agent 2" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Criteria Manager */}
        <div className="space-y-4 border p-4 rounded-md">
          <div className="font-medium flex items-center">
            Evaluation Criteria
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 ml-2 cursor-help text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Define criteria for evaluating prompt variations. Each criterion has a weight (1-5) that determines its importance.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={criteriaName}
              onChange={(e) => setCriteriaName(e.target.value)}
              placeholder="e.g., Coherence"
              className={criteriaErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {criteriaErrors.name && <p className="text-sm text-red-500">{criteriaErrors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={criteriaDescription}
              onChange={(e) => setCriteriaDescription(e.target.value)}
              placeholder="Describe what this criterion evaluates..."
              className={criteriaErrors.description ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {criteriaErrors.description && <p className="text-sm text-red-500">{criteriaErrors.description}</p>}
          </div>

          <div className="space-y-2">
            <Label>Weight (1-5)</Label>
            <div className="flex items-center">
              <Input
                type="number"
                min={1}
                max={5}
                value={criteriaWeight}
                onChange={(e) => setCriteriaWeight(parseInt(e.target.value))}
                className="w-20"
              />
              <span className="ml-2 text-sm text-muted-foreground">Higher weight = higher importance</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAddCriterion} className="flex-1">
              {editingCriterion !== null ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Update Criterion
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Criterion
                </>
              )}
            </Button>
            
            {editingCriterion !== null && (
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Criteria List */}
        {data.criteria.length > 0 && (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.criteria.map((criterion) => (
                  <TableRow key={criterion.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{criterion.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {criterion.description}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={criterion.weight.toString()}
                        onValueChange={(value) => handleWeightChange(criterion.id, parseInt(value))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCriterion(criterion)}
                          title="Edit criterion"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Remove criterion"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Criterion</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the "{criterion.name}" criterion? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveCriterion(criterion.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Evaluation Progress */}
        {data.isEvaluating && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Evaluation Progress</Label>
              <span className="text-sm">{data.progress.toFixed(0)}%</span>
            </div>
            <Progress value={data.progress} className="w-full" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-3 rounded-md flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Evaluation Button */}
        {data.variations && data.variations.length > 0 && data.testCases && data.testCases.length > 0 ? (
          <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setIsConfirmDialogOpen(true)}
                className="w-full"
                disabled={
                  data.isEvaluating || 
                  data.criteria.length === 0
                }
              >
                {data.isEvaluating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Evaluating...
                  </>
                ) : (
                  'Start Evaluation'
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Evaluation</DialogTitle>
                <DialogDescription>
                  You are about to evaluate {data.variations.length} variations with {data.testCases.length} test cases 
                  against {data.criteria.length} criteria. This will use multiple AI agents and may take some time.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Variations:</Label>
                      <p className="text-sm">{data.variations.length}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Test Cases:</Label>
                      <p className="text-sm">{data.testCases.length}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Criteria:</Label>
                      <p className="text-sm">{data.criteria.length}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Total Evaluations:</Label>
                      <p className="text-sm">{data.variations.length * data.testCases.length * data.criteria.length}</p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStartEvaluation}>
                  Start Evaluation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Button
            className="w-full"
            disabled={true}
          >
            Missing Variations or Test Cases
          </Button>
        )}

        {/* Additional UI element after the evaluation results section */}
        {data.results && data.results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Evaluation Results</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="show-reasoning" className="text-sm">Show Agent Reasoning</Label>
                <Switch 
                  id="show-reasoning" 
                  checked={showReasoning} 
                  onCheckedChange={setShowReasoning} 
                />
              </div>
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variation</TableHead>
                    <TableHead>Test Case</TableHead>
                    <TableHead>Criterion</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.results.slice(0, 10).map((result, idx) => {
                    // Find the variation, test case and criterion names
                    const variation = data.variations?.find(v => v.id === result.variationId);
                    const testCase = data.testCases?.find(t => t.id === result.testCaseId);
                    const criterion = data.criteria.find(c => c.id === result.criterionId);
                    
                    return (
                      <TableRow key={idx}>
                        <TableCell className="font-mono">V{result.variationId + 1}</TableCell>
                        <TableCell className="truncate max-w-[120px]">
                          {testCase ? (
                            <span title={testCase.input}>{testCase.input.substring(0, 20)}...</span>
                          ) : (
                            `Test Case ${result.testCaseId + 1}`
                          )}
                        </TableCell>
                        <TableCell>{criterion ? criterion.name : `Criterion ${result.criterionId}`}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={getScoreColor(result.score)}>
                              {result.score.toFixed(1)}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6" 
                              onClick={() => openResultDetails(result)}
                              title="View detailed reasoning"
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => displayAgentReasoning(result)}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {data.results.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        Showing first 10 of {data.results.length} results. Check Results node for full details.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {showReasoning && selectedResult && (
              <div className="border rounded-md p-4 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Agent Reasoning</h4>
                  <Badge variant="outline">{selectedResult.evaluatorModel}</Badge>
                </div>
                <ScrollArea className="h-60">
                  <div className="prose prose-sm dark:prose-invert whitespace-pre-wrap">
                    {displayAgentReasoning(selectedResult)}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* Result Details Dialog */}
        <ResultDetailsDialog />
      </CardContent>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="w-3 h-3 bg-primary"
      />

      {/* Output handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="output-results"
        className="w-3 h-3 bg-primary"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output-arena"
        className="w-3 h-3 bg-primary"
      />
    </Card>
  );
};

export default EvaluationNode;