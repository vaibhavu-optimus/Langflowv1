import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ConnectionLineType,
  BackgroundVariant,
  Node,
  Connection,
  Edge,
  NodeChange,
  EdgeChange,
  OnNodesChange,
  OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useFlowStore, saveFlowToLocalStorage, loadFlowFromLocalStorage } from '../../../../stores/flowstoreNew';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Save, 
  Upload,
  DownloadCloud, 
  RefreshCw, 
  ZoomIn,
  Moon,
  Sun,
  StopCircle,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// import { ThemeToggle } from '@/components/theme-toggle';
import { useAutoMode } from '@/hooks/use-auto-mode';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
// import { useTheme } from "next-themes";

// Import node components
import BasePromptNode from './nodes/BasePromptNode';
import MetaPromptNode from './nodes/MetaPromptNode';
import VariationsNode from './nodes/VariationsNode';
import TestCasesNode from './nodes/TestCasesNode';
import EvaluationNode from './nodes/EvaluationNode';
import ResultsNode from './nodes/ResultsNode';
import ModelArenaNode from './nodes/ModelArenaNode';
import { FlowNode, FlowEdge } from '../../../../types/flowTypes';

// Node types mapping
const nodeTypes = {
  basePromptNode: BasePromptNode,
  metaPromptNode: MetaPromptNode,
  variationsNode: VariationsNode,
  testCasesNode: TestCasesNode,
  evaluationNode: EvaluationNode,
  resultsNode: ResultsNode,
  modelArenaNode: ModelArenaNode
};

// Simple Flow Editor component
const SimpleFlowEditor = () => {
  // Get flow store state directly
  const {
    nodes,
    edges,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    setReactFlowInstance,
    onNodesConnect,
    onNodesDelete,
    resetFlow,
    updateNodeData,
    getNodeByType,
  } = useFlowStore();
  
  // Local state for UI elements only
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // const { theme } = useTheme();
  
  // State to track auto mode status and get the stopAutoMode function
  const [isAutoMode, setIsAutoMode] = useState(false);
  const { stopAutoMode } = useAutoMode();
  
  // Set up mock API flag to ensure we can work without a backend
  useEffect(() => {
    if (localStorage.getItem('MOCK_API')) {
      localStorage.removeItem('MOCK_API'); // Remove the mock flag to ensure real AI responses
    }
  }, []);
  
  // Node changes handler - crucial for dragging functionality
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const updatedNodes = applyNodeChanges(changes, nodes);
      // Only update store with result to avoid loops
      setStoreNodes(updatedNodes);
    },
    [nodes, setStoreNodes]
  );
  
  // Edge changes handler
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const updatedEdges = applyEdgeChanges(changes, edges);
      // Only update store with result to avoid loops
      setStoreEdges(updatedEdges);
    },
    [edges, setStoreEdges]
  );
  
  // Initialize ReactFlow instance
  const onInit = useCallback((instance: any) => {
    setReactFlowInstance(instance);
    // Load saved flow with a slight delay
    setTimeout(() => {
      try {
        const loaded = loadFlowFromLocalStorage();
        if (loaded) {
          toast({
            title: "Flow Loaded",
            description: "Successfully loaded your saved flow",
          });
        }
      } catch (error) {
        console.error("Failed to load flow:", error);
      }
      // Hide loading indicator
      setIsInitialLoading(false);
    }, 500);
  }, [setReactFlowInstance, toast]);
  
  // Fit view safely
  const fitView = useCallback(() => {
    const instance = useFlowStore.getState().reactFlowInstance;
    if (instance) {
      try {
        setTimeout(() => {
          instance.fitView({ padding: 0.2 });
        }, 50);
      } catch (error) {
        console.error("Error fitting view:", error);
      }
    }
  }, []);
  
  // Handle basic operations
  const handleSaveFlow = useCallback(() => {
    try {
      const saved = saveFlowToLocalStorage();
      if (saved) {
        toast({
          title: "Flow Saved",
          description: "Your flow has been saved to local storage",
        });
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save flow",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  const handleResetFlow = useCallback(() => {
    resetFlow();
    setIsResetDialogOpen(false);
    
    toast({
      title: "Flow Reset",
      description: "All nodes have been reset to their initial state",
    });
    
    setTimeout(fitView, 100);
  }, [resetFlow, toast, fitView]);
  
  // Handle connect
  const onConnect = useCallback((params: Connection) => {
    onNodesConnect(params);
  }, [onNodesConnect]);
  
  // Check if auto mode is active
  useEffect(() => {
    // Check if any nodes are in "running auto mode" state
    const basePromptNode = getNodeByType('basePromptNode');
    const metaPromptNode = getNodeByType('metaPromptNode');
    const variationsNode = getNodeByType('variationsNode');
    const testCasesNode = getNodeByType('testCasesNode');
    const evaluationNode = getNodeByType('evaluationNode');
    
    // Use type assertion and optional chaining for safe property access
    const isAnyNodeRunning = 
      (basePromptNode?.data && 'isAutoMode' in basePromptNode.data && basePromptNode.data.isAutoMode) || 
      (metaPromptNode?.data && 'isGenerating' in metaPromptNode.data && metaPromptNode.data.isGenerating) || 
      (variationsNode?.data && 'isGenerating' in variationsNode.data && variationsNode.data.isGenerating) || 
      (testCasesNode?.data && 'isGenerating' in testCasesNode.data && testCasesNode.data.isGenerating) || 
      (evaluationNode?.data && 'isEvaluating' in evaluationNode.data && evaluationNode.data.isEvaluating);
    
    setIsAutoMode(!!isAnyNodeRunning);
  }, [nodes, getNodeByType]);
  
  // Handle stopping auto mode using the hook's stopAutoMode function
  const handleStopAutoMode = useCallback(() => {
    // Call the hook's stopAutoMode function
    stopAutoMode();
    
    // Also update all nodes to stop their processing immediately
    const basePromptNode = getNodeByType('basePromptNode');
    const metaPromptNode = getNodeByType('metaPromptNode');
    const variationsNode = getNodeByType('variationsNode');
    const testCasesNode = getNodeByType('testCasesNode');
    const evaluationNode = getNodeByType('evaluationNode');
    
    if (basePromptNode) {
      updateNodeData(basePromptNode.id, { isAutoMode: false });
    }
    
    if (metaPromptNode) {
      updateNodeData(metaPromptNode.id, { isGenerating: false });
    }
    
    if (variationsNode) {
      updateNodeData(variationsNode.id, { isGenerating: false });
    }
    
    if (testCasesNode) {
      updateNodeData(testCasesNode.id, { isGenerating: false });
    }
    
    if (evaluationNode) {
      updateNodeData(evaluationNode.id, { isEvaluating: false, progress: 0 });
    }
    
    setIsAutoMode(false);
    
    toast({
      title: "Auto Mode Stopped",
      description: "Auto mode has been stopped",
    });
  }, [getNodeByType, updateNodeData, toast, stopAutoMode]);
  
  // Check if any node is loading
  const isAnyNodeLoading = useMemo(() => {
    return nodes.some(node => {
      if (!node.data) return false;
      return (
        ('isGenerating' in node.data && node.data.isGenerating) ||
        ('isEvaluating' in node.data && node.data.isEvaluating) ||
        ('isComparing' in node.data && node.data.isComparing)
      );
    });
  }, [nodes]);
  
  // Export flow
  const handleExportFlow = useCallback(() => {
    try {
      const flowData = {
        nodes,
        edges,
        exportedAt: new Date().toISOString()
      };
      
      const jsonString = JSON.stringify(flowData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-optimizer-flow-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Flow Exported",
        description: "Your flow has been exported as JSON",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export flow",
        variant: "destructive",
      });
    }
  }, [nodes, edges, toast]);
  
  // Import flow
  const handleImportFlow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const flowData = JSON.parse(content);
        
        if (!flowData.nodes || !flowData.edges) {
          throw new Error("Invalid flow data format");
        }
        
        // Reset input value to allow re-importing the same file
        event.target.value = '';
        
        // Process nodes to ensure valid positions
        const validNodes = flowData.nodes.map((node: any) => ({
          ...node,
          position: {
            x: typeof node.position?.x === 'number' ? node.position.x : 0,
            y: typeof node.position?.y === 'number' ? node.position.y : 0
          }
        }));
        
        // Load into store
        useFlowStore.getState().loadFlow(validNodes, flowData.edges);
        
        toast({
          title: "Flow Imported",
          description: "Successfully imported flow data",
        });
        
        setTimeout(fitView, 100);
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to import flow. Invalid format.",
          variant: "destructive",
        });
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "Import Failed",
        description: "Failed to read the file",
        variant: "destructive",
      });
    };
    
    reader.readAsText(file);
  }, [toast, fitView]);
  
  // Initial effect on mount
  useEffect(() => {
    // Clear any remaining error state
    if (localStorage.getItem('flow-error')) {
      localStorage.removeItem('flow-error');
    }
    
    // Ensure all nodes have proper spacing and positions to avoid overlapping
    const repositionNodes = () => {
      // Get nodes from the store
      const storeNodes = [...useFlowStore.getState().nodes];
      
      // Make sure nodes are sorted by their natural sequence in the workflow
      const nodeTypeOrder = [
        'basePromptNode', 
        'metaPromptNode', 
        'variationsNode', 
        'testCasesNode', 
        'evaluationNode', 
        'resultsNode',
        'modelArenaNode'
      ];
      
      // Sort nodes according to the workflow sequence
      const sortedNodes = [...storeNodes].sort((a, b) => {
        const typeA = a.type || '';
        const typeB = b.type || '';
        return nodeTypeOrder.indexOf(typeA) - nodeTypeOrder.indexOf(typeB);
      });
      
      // Apply more generous spacing
      const verticalSpacing = 220; // Increased vertical spacing
      const horizontalPosition = 250; // Center position
      
      const updatedNodes = sortedNodes.map((node, index) => {
        return {
          ...node,
          position: {
            x: horizontalPosition,
            y: index * verticalSpacing + 50 // Start from y=50 with proper spacing
          }
        };
      });
      
      // Update all nodes in the store
      useFlowStore.getState().setNodes(updatedNodes);
      
      // Give time for the changes to apply, then fit view
      setTimeout(() => {
        try {
          const instance = useFlowStore.getState().reactFlowInstance;
          if (instance) {
            instance.fitView({ padding: 0.2 });
          }
        } catch (error) {
          console.error("Error fitting view after repositioning:", error);
        }
      }, 100);
    };
    
    // Load the flow and then reposition nodes
    setTimeout(() => {
      try {
        const loaded = loadFlowFromLocalStorage();
        if (loaded) {
          toast({
            title: "Flow Loaded",
            description: "Successfully loaded your saved flow",
          });
        }
        
        // Reposition nodes whether we loaded a saved flow or not
        // Increase the delay to ensure React Flow is fully initialized
        setTimeout(repositionNodes, 500);
        
        // Ensure fit view is triggered after initial load and repositioning
        setTimeout(() => {
          fitView();
          setIsInitialLoading(false);
        }, 700);
      } catch (error) {
        console.error("Failed to load flow:", error);
        
        // Even if loading fails, reposition the default nodes
        setTimeout(repositionNodes, 500);
        setIsInitialLoading(false);
      }
    }, 800);
    
    return () => {};
  }, [fitView]);
  
  const handleBackToMainFlow = useCallback(() => {
    
    const currentUrl = window.location.href;
    const url = new URL(currentUrl);
    const returnUrl = url.searchParams.get('returnUrl');
    console.log(returnUrl);
    if (returnUrl) {
      window.location.href = returnUrl;
    } else {
      console.warn('No return URL found in the query parameters');
    }
    
  }, []);


  return (
    <div className="h-[calc(100vh-150px)] w-full border rounded-lg shadow-sm overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onConnect={onConnect}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        onInit={onInit}
        fitView
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls showInteractive={false} />
        <MiniMap zoomable pannable />
        
        {/* Top left panel for theme toggle */}
        <Panel position="top-left">
          <div className="flex flex-col gap-2">
            {/* <ThemeToggle /> */}
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackToMainFlow}
              className="flex items-center gap-2"
              title="Back to main flow"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to main flow
            </Button>
          </div>
        </Panel>
        
        {/* Top right panel for controls */}
        <Panel position="top-right">
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFlow}
              accept=".json"
              className="hidden"
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnyNodeLoading}
              className="flex items-center gap-2"
              title="Import Flow"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportFlow}
              disabled={isAnyNodeLoading}
              className="flex items-center gap-2"
              title="Export Flow"
            >
              <DownloadCloud className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveFlow}
              disabled={isAnyNodeLoading}
              className="flex items-center gap-2"
              title="Save Flow"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetDialogOpen(true)}
              disabled={isAnyNodeLoading}
              className="flex items-center gap-2"
              title="Reset Flow"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={fitView}
              className="flex items-center gap-2"
              title="Fit View"
            >
              <ZoomIn className="h-4 w-4" />
              <span className="hidden sm:inline">Fit</span>
            </Button>
          </div>
        </Panel>
        
        {isAutoMode && (
          <Panel position="bottom-center">
            <Button
              variant="destructive"
              onClick={handleStopAutoMode}
              className="flex items-center gap-2"
            >
              <StopCircle className="h-4 w-4" />
              <span>Stop Auto Mode</span>
            </Button>
          </Panel>
        )}
        
        {isAnyNodeLoading && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 bg-background/80 rounded-full px-4 py-1 shadow-md flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </div>
        )}
        
        {isInitialLoading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Loading Flow Editor...</p>
            </div>
          </div>
        )}
      </ReactFlow>
      
      {/* Reset Confirmation Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Flow</DialogTitle>
            <DialogDescription>
              This will reset all nodes to their initial state. Any unsaved progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleResetFlow}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Error boundary wrapper
class ErrorBoundary extends React.Component<{
  children: React.ReactNode;
  onError: () => void;
}> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Flow Editor error:", error, errorInfo);
    localStorage.setItem('flow-error', 'true');
    this.props.onError();
  }

  render() {
    return this.props.children;
  }
}

// Main wrapper component with error recovery
const FlowEditorWrapper = () => {
  const [error, setError] = useState(false);
  const [key, setKey] = useState(Date.now());
  
  const handleError = useCallback(() => {
    setError(true);
  }, []);
  
  const handleReset = useCallback(() => {
    // Clear any stored flow data
    localStorage.removeItem('promptOptimizerFlow');
    // Reset the component
    setKey(Date.now());
    setError(false);
  }, []);
  
  if (error) {
    return (
      <div className="h-[calc(100vh-150px)] w-full border rounded-lg shadow-sm overflow-hidden bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h3 className="text-xl font-semibold">Something went wrong with the Flow Editor</h3>
          <p className="text-muted-foreground">
            There was an error with the flow editor. This could be due to corrupted flow data.
          </p>
          <Button onClick={handleReset} variant="destructive">
            Reset Editor
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div key={key} className="w-full h-full">
      <ReactFlowProvider>
        <ErrorBoundary onError={handleError}>
          <SimpleFlowEditor />
        </ErrorBoundary>
      </ReactFlowProvider>
    </div>
  );
};

export const FlowEditor = FlowEditorWrapper;
export default FlowEditor;