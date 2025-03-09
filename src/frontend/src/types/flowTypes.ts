import { Node, Edge, Connection, ReactFlowInstance, XYPosition } from 'reactflow';
import type { 
  MetaPrompt, 
  PromptVariation, 
  TestCase, 
  EvaluationResult, 
  ModelConfig,
  EvaluationCriterion 
} from "../shared/schema";

// Base node data that all nodes will extend
export interface NodeData {
  label: string;
  nodeType: string;
}

// Node data for base prompt input
export interface BasePromptNodeData extends NodeData {
  basePrompt: string;
  modelConfig: ModelConfig;
  isAutoMode: boolean;
}

// Node data for meta prompt output
export interface MetaPromptNodeData extends NodeData {
  basePrompt?: string;
  metaPrompt: MetaPrompt | null;
  modelConfig: ModelConfig;
  isGenerating: boolean;
  // Additional field to support direct string format of generated prompt
  generatedPromptText?: string;
}

// Node data for variations output
export interface VariationsNodeData extends NodeData {
  metaPrompt: MetaPrompt | null;
  variations: PromptVariation[];
  modelConfig: ModelConfig;
  isGenerating: boolean;
}

// Node data for test cases
export interface TestCasesNodeData extends NodeData {
  metaPrompt: MetaPrompt | null;
  testCases: TestCase[];
  modelConfig: ModelConfig;
  isGenerating: boolean;
}

// Node data for evaluation
export interface EvaluationNodeData extends NodeData {
  variations: PromptVariation[] | null;
  testCases: TestCase[] | null;
  criteria: EvaluationCriterion[];
  results: EvaluationResult[] | null;
  modelConfig: ModelConfig;
  isEvaluating: boolean;
  progress: number;
}

// Node data for results
export interface ResultsNodeData extends NodeData {
  variations: PromptVariation[] | null;
  testCases: TestCase[] | null;
  evaluationResults: EvaluationResult[] | null;
}

// Node data for model arena
export interface ModelArenaNodeData extends NodeData {
  variations: PromptVariation[] | null;
  testCases: TestCase[] | null;
  results: any[] | null; // Model comparison results
  activeModels: ModelConfig[];
  isComparing: boolean;
}

// Union type for all possible node data types
export type FlowNodeData = 
  | BasePromptNodeData
  | MetaPromptNodeData
  | VariationsNodeData
  | TestCasesNodeData
  | EvaluationNodeData
  | ResultsNodeData
  | ModelArenaNodeData;

export type FlowNode = Node<FlowNodeData>;
export type FlowEdge = Edge;

// Flow state interface for Zustand store
export interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  reactFlowInstance: ReactFlowInstance | null;
  
  // Actions
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  setReactFlowInstance: (instance: ReactFlowInstance) => void;
  
  // Node operations
  addNode: (type: string, data: FlowNodeData, position: XYPosition) => void;
  updateNodeData: (nodeId: string, data: Partial<FlowNodeData>) => void;
  onNodesConnect: (connection: Connection) => void;
  onNodesDelete: (nodes: FlowNode[]) => void;
  
  // Flow operations
  resetFlow: () => void;
  loadFlow: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  
  // Get node by type
  getNodeByType: (type: string) => FlowNode | undefined;
  
  // Specific node data getters
  getBasePromptData: () => BasePromptNodeData | undefined;
  getMetaPromptData: () => MetaPromptNodeData | undefined;
  getVariationsData: () => VariationsNodeData | undefined;
  getTestCasesData: () => TestCasesNodeData | undefined;
  getEvaluationData: () => EvaluationNodeData | undefined;
  getResultsData: () => ResultsNodeData | undefined;
  getModelArenaData: () => ModelArenaNodeData | undefined;
}

// Crew AI agent types
export interface CrewAgent {
  name: string;
  model: string;
  role: string;
  goal: string;
  backstory: string;
}

export interface AgentEvaluationResult {
  variationId: number;
  testCaseId: number;
  criterionId: number;
  score: number;
  reasoning: string;
  agent: string;
}

// Error types for error handling
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ProcessingState {
  isLoading: boolean;
  error: ApiError | null;
  progress?: number;
}