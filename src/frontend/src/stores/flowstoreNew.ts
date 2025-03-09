import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { produce } from 'immer';
import { nanoid } from 'nanoid';
import { defaultModelConfigs } from '@/lib/model-config';
import type { MetaPrompt } from '../shared/schema';
import {
  FlowState,
  FlowNode,
  FlowEdge,
  FlowNodeData,
  BasePromptNodeData,
  MetaPromptNodeData,
  VariationsNodeData,
  TestCasesNodeData,
  EvaluationNodeData,
  ResultsNodeData,
  ModelArenaNodeData
} from '../types/flowTypes';

// Get the initial nodes for the flow
const getInitialNodes = (): FlowNode[] => {
  return [
    {
      id: 'base-prompt',
      type: 'basePromptNode',
      position: { x: 250, y: 50 },
      data: {
        label: 'Base Prompt',
        nodeType: 'basePromptNode',
        basePrompt: '',
        modelConfig: defaultModelConfigs[0],
        isAutoMode: false
      } as BasePromptNodeData
    },
    {
      id: 'meta-prompt',
      type: 'metaPromptNode',
      position: { x: 250, y: 200 },
      data: {
        label: 'Meta Prompt',
        nodeType: 'metaPromptNode',
        metaPrompt: null,
        modelConfig: defaultModelConfigs[0],
        isGenerating: false
      } as MetaPromptNodeData
    },
    {
      id: 'variations',
      type: 'variationsNode',
      position: { x: 250, y: 350 },
      data: {
        label: 'Variations',
        nodeType: 'variationsNode',
        metaPrompt: null,
        variations: [],
        modelConfig: defaultModelConfigs[0],
        isGenerating: false
      } as VariationsNodeData
    },
    {
      id: 'test-cases',
      type: 'testCasesNode',
      position: { x: 250, y: 500 },
      data: {
        label: 'Test Cases',
        nodeType: 'testCasesNode',
        metaPrompt: null,
        testCases: [],
        modelConfig: defaultModelConfigs[0],
        isGenerating: false
      } as TestCasesNodeData
    },
    {
      id: 'evaluation',
      type: 'evaluationNode',
      position: { x: 250, y: 650 },
      data: {
        label: 'Evaluation',
        nodeType: 'evaluationNode',
        variations: null,
        testCases: null,
        criteria: [],
        results: null,
        modelConfig: defaultModelConfigs[0],
        isEvaluating: false,
        progress: 0
      } as EvaluationNodeData
    },
    {
      id: 'results',
      type: 'resultsNode',
      position: { x: 250, y: 800 },
      data: {
        label: 'Results',
        nodeType: 'resultsNode',
        variations: null,
        testCases: null,
        evaluationResults: null
      } as ResultsNodeData
    },
    {
      id: 'model-arena',
      type: 'modelArenaNode',
      position: { x: 600, y: 650 },
      data: {
        label: 'Model Arena',
        nodeType: 'modelArenaNode',
        variations: null,
        testCases: null,
        results: null,
        activeModels: [],
        isComparing: false
      } as ModelArenaNodeData
    }
  ];
};

// Get the initial edges for the flow
const getInitialEdges = (): FlowEdge[] => {
  return [
    {
      id: 'base-to-meta',
      source: 'base-prompt',
      target: 'meta-prompt',
      animated: true
    },
    {
      id: 'meta-to-variations',
      source: 'meta-prompt',
      target: 'variations',
      animated: true
    },
    {
      id: 'variations-to-test-cases',
      source: 'variations',
      target: 'test-cases',
      animated: true
    },
    {
      id: 'test-cases-to-evaluation',
      source: 'test-cases',
      target: 'evaluation',
      animated: true
    },
    {
      id: 'evaluation-to-results',
      source: 'evaluation',
      target: 'results',
      animated: true
    },
    {
      id: 'evaluation-to-model-arena',
      source: 'evaluation',
      target: 'model-arena',
      animated: true
    }
  ];
};

// Helper function to validate node positions to prevent 'x' undefined errors
const validateNodePositions = (nodes: FlowNode[]): FlowNode[] => {
  return nodes.map(node => {
    // Ensure node has a valid position
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      console.warn(`Node ${node.id} has invalid position, fixing`);
      return {
        ...node,
        position: { x: node.position?.x || 0, y: node.position?.y || 0 }
      };
    }
    return node;
  });
};

// Create the flow store
export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: getInitialNodes(),
  edges: getInitialEdges(),
  reactFlowInstance: null,

  // Set methods
  setNodes: (nodes) => set({ nodes: validateNodePositions(nodes) }),
  setEdges: (edges) => set({ edges }),
  setReactFlowInstance: (instance) => set({ reactFlowInstance: instance }),

  // Node operations
  addNode: (type, data, position) => {
    // Ensure position is valid
    const safePosition = {
      x: typeof position.x === 'number' ? position.x : 0,
      y: typeof position.y === 'number' ? position.y : 0
    };
    
    const newNode: FlowNode = {
      id: `${type}-${nanoid(6)}`,
      type,
      position: safePosition,
      data: {
        ...data,
        nodeType: type
      }
    };

    set(
      produce((state: FlowState) => {
        state.nodes.push(newNode);
      })
    );

    return newNode;
  },

  updateNodeData: (id: string, newData: Partial<FlowNodeData>) => {
    // Make a deep copy to avoid any state mutation issues
    const nodes = [...get().nodes];
    const nodeIndex = nodes.findIndex(node => node.id === id);
    
    if (nodeIndex !== -1) {
      // Create a copy of the current node
      const node = { ...nodes[nodeIndex] };
      
      // Check for specific boolean values that should always update
      const isBooleanProperty = (key: string, value: any) => {
        // This is necessary for boolean properties that need to be tracked
        return typeof value === 'boolean' && 
               ['isAutoMode', 'isGenerating', 'isEvaluating', 'isComparing'].includes(key);
      };

      if (node.data) {
        // Create a new data object with the merged data
        const currentData = { ...node.data };
        const updatedData = { ...currentData };
        
        // Check each key in newData to determine if an update is needed
        let hasChanges = false;
        
        for (const key in newData) {
          if (Object.prototype.hasOwnProperty.call(newData, key)) {
            const newValue = (newData as any)[key];
            
            // Always update boolean tracking properties
            if (isBooleanProperty(key, newValue)) {
              if ((updatedData as any)[key] !== newValue) {
                console.log(`Updating boolean property ${key} from ${(updatedData as any)[key]} to ${newValue}`);
                (updatedData as any)[key] = newValue;
                hasChanges = true;
              }
              continue;
            }

            // Skip undefined values
            if (newValue === undefined) continue;
            
            // For objects and arrays, use JSON comparison to detect changes
            if (typeof newValue === 'object' && newValue !== null) {
              // Stringify both for comparison (handles arrays and objects)
              const currentStr = JSON.stringify((currentData as any)[key]);
              const newStr = JSON.stringify(newValue);
              
              if (currentStr !== newStr) {
                (updatedData as any)[key] = newValue;
                hasChanges = true;
              }
            } 
            // For primitives, direct comparison
            else if ((currentData as any)[key] !== newValue) {
              (updatedData as any)[key] = newValue;
              hasChanges = true;
            }
          }
        }
        
        // Only update if there are actual changes
        if (hasChanges) {
          nodes[nodeIndex] = {
            ...node,
            data: updatedData
          };
          
          set({ nodes });
          console.log(`Updated node ${id} data`);
        } else {
          console.log(`No changes detected for node ${id}, skipping update`);
        }
      }
    }
  },

  onNodesConnect: (connection) => {
    // Validate connection
    if (!connection.source || !connection.target) {
      console.error("Invalid connection: missing source or target");
      return;
    }

    // Create edge with unique ID
    const newEdge = {
      id: `${connection.source}-${connection.target}-${nanoid(4)}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      animated: true
    };

    set((state) => ({
      edges: addEdge(newEdge, state.edges)
    }));
  },

  onNodesDelete: (nodesToDelete) => {
    set(
      produce((state: FlowState) => {
        // Remove the nodes
        const nodeIdsToDelete = nodesToDelete.map((n) => n.id);
        state.nodes = state.nodes.filter((n) => !nodeIdsToDelete.includes(n.id));

        // Remove any connected edges
        state.edges = state.edges.filter(
          (e) => !nodeIdsToDelete.includes(e.source) && !nodeIdsToDelete.includes(e.target)
        );
      })
    );
  },

  // Flow operations
  resetFlow: () => {
    set({
      nodes: getInitialNodes(),
      edges: getInitialEdges()
    });
  },

  loadFlow: (nodes, edges) => {
    set({
      nodes: validateNodePositions(nodes),
      edges
    });
  },

  // Get node by type
  getNodeByType: (type) => {
    return get().nodes.find((n) => n.data.nodeType === type);
  },

  // Specific node data getters
  getBasePromptData: () => {
    const node = get().nodes.find((n) => n.data.nodeType === 'basePromptNode');
    return node?.data as BasePromptNodeData | undefined;
  },

  getMetaPromptData: () => {
    const node = get().nodes.find((n) => n.data.nodeType === 'metaPromptNode');
    return node?.data as MetaPromptNodeData | undefined;
  },

  getVariationsData: () => {
    const node = get().nodes.find((n) => n.data.nodeType === 'variationsNode');
    return node?.data as VariationsNodeData | undefined;
  },

  getTestCasesData: () => {
    const node = get().nodes.find((n) => n.data.nodeType === 'testCasesNode');
    return node?.data as TestCasesNodeData | undefined;
  },

  getEvaluationData: () => {
    const node = get().nodes.find((n) => n.data.nodeType === 'evaluationNode');
    return node?.data as EvaluationNodeData | undefined;
  },

  getResultsData: () => {
    const node = get().nodes.find((n) => n.data.nodeType === 'resultsNode');
    return node?.data as ResultsNodeData | undefined;
  },

  getModelArenaData: () => {
    const node = get().nodes.find((n) => n.data.nodeType === 'modelArenaNode');
    return node?.data as ModelArenaNodeData | undefined;
  }
}));

// Export a hook to use the flow store with a selector for performance
export function useFlowStoreWithSelector<T>(selector: (state: FlowState) => T): T {
  return useFlowStore(selector);
}

// Helper function to save flow to local storage
export const saveFlowToLocalStorage = () => {
  try {
    const { nodes, edges } = useFlowStore.getState();
    // Validate nodes before saving to ensure positions are valid
    const validatedNodes = validateNodePositions(nodes);
    localStorage.setItem('promptOptimizerFlow', JSON.stringify({ nodes: validatedNodes, edges }));
    return true;
  } catch (error) {
    console.error('Failed to save flow state:', error);
    return false;
  }
};

// Helper function to load flow from local storage
export const loadFlowFromLocalStorage = () => {
  try {
    const savedFlow = localStorage.getItem('promptOptimizerFlow');
    if (savedFlow) {
      const { nodes, edges } = JSON.parse(savedFlow);
      // Validate nodes to ensure positions are valid
      const validatedNodes = validateNodePositions(nodes);
      useFlowStore.getState().loadFlow(validatedNodes, edges);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to load flow state:', error);
    return false;
  }
};